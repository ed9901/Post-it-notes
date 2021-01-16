"""
This file defines actions, i.e. functions the URLs are mapped into
The @action(path) decorator exposed the function at URL:

    http://127.0.0.1:8000/{app_name}/{path}

If app_name == '_default' then simply

    http://127.0.0.1:8000/{path}

If path == 'index' it can be omitted:

    http://127.0.0.1:8000/

The path follows the bottlepy syntax.

@action.uses('generic.html')  indicates that the action uses the generic.html template
@action.uses(session)         indicates that the action uses the session
@action.uses(db)              indicates that the action uses the db
@action.uses(T)               indicates that the action uses the i18n & pluralization
@action.uses(auth.user)       indicates that the action requires a logged in user
@action.uses(auth)            indicates that the action requires the auth object

session, db, T, auth, and tempates are examples of Fixtures.
Warning: Fixtures MUST be declared with @action.uses({fixtures}) else your app will result in undefined behavior
"""

import uuid
import datetime

from py4web import action, request, abort, redirect, URL, Field
from py4web.utils.form import Form, FormStyleBulma
from py4web.utils.url_signer import URLSigner

from yatl.helpers import A
from . common import db, session, T, cache, auth, signed_url


url_signer = URLSigner(session)

def get_user_email():
    return auth.current_user.get('email') if auth.current_user else None

def get_time():
    return datetime.datetime.utcnow()

# The auth.user below forces login.
@action('index')
@action.uses(auth.user, url_signer, session, db, 'index.html')
def index():
    return dict(
        # This is an example of a signed URL for the callback.
        # See the index.html template for how this is passed to the javascript.
        callback_url = URL('callback', signer=url_signer),
        notes_url = URL('notes', signer=url_signer),
        delete_url = URL('delete_note', signer=url_signer),
        star_url = URL('set_star', signer=url_signer),
        color_url = URL('set_color', signer=url_signer),
    )

@action('notes', method="GET")
@action.uses(db, auth.user, session, url_signer.verify())
def get_notes():
    starred_notes = []
    unstarred_notes = []
    starred_notes = db( (db.note.user_email == get_user_email()) &
    (db.note.star == 1) ).select(orderby=~db.note.post_date).as_list()
    unstarred_notes = db( (db.note.user_email == get_user_email()) &
    (db.note.star == -1) ).select(orderby=~db.note.post_date).as_list()
    return dict(starred_notes=starred_notes, unstarred_notes=unstarred_notes)

@action('notes',  method="POST")
@action.uses(db, auth.user)  # etc.  Put here what you need.
def save_note():
    id = request.json.get('id') # Note: id can be none.
    title_content = request.json.get('title_content')
    body_content = request.json.get('body_content')
    if id is None:
        id = db.note.insert(title_content = title_content, body_content = body_content)
    else:
        r = db(db.note.id == id).select().first()
        r.update_record(title_content = title_content)
        r.update_record(body_content = body_content)
        r.update_record(post_date = get_time())
    return dict(title_content=title_content, body_content=body_content, id=id)

@action('delete_note',  method="POST")
@action.uses(db, auth.user, session, url_signer.verify())
def delete_note():
    db((db.note.user_email == auth.current_user.get('email')) &
       (db.note.id == request.json.get('id'))).delete()
    return "ok"

@action('set_star', method='POST')
@action.uses(url_signer.verify(), db, auth.user)
def set_star():
    #Set the logged-in users rating for a post
    note_id = request.json.get('id')
    rate = request.json.get('star')
    assert note_id is not None and rate is not None
    db.note.update_or_insert(
        ((db.note.id == note_id)),
        star = rate,
        post_date = get_time()
        )
    return "ok"

@action('set_color', method='POST')
@action.uses(url_signer.verify(), db, auth.user)
def set_color():
    #Set the logged-in users rating for a post
    note_id = request.json.get('id')
    new_color = request.json.get('color')
    assert note_id is not None and new_color is not None
    db.note.update_or_insert(
        ((db.note.id == note_id)),
        color = new_color,
        #post_date = get_time()
        )
    return "ok"