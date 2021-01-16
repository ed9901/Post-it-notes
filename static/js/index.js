// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};

// Given an empty app object, initializes it filling its attributes,
// creates a Vue instance, and then initializes the Vue instance.
let init = (app) => {

    // This is the Vue data.
    app.data = {
        notes: [],
    };
    
    app.index = (a) => {
        // Adds to the notes all the fields on which the UI relies.
        let i = 0;
        for (let p of a) {
            p._idx = i++;
            p.edit = false;
            p.is_pending = false;
            p.error = false;
            p.original_title_content = p.title_content; // Content before an edit.
            p.server_title_content = p.title_content; // Content on the server.
            p.original_body_content = p.body_content; // Content before an edit.
            p.server_body_content = p.body_content; // Content on the server.
        }
        return a;
    };
    
    app.reindex = () => {
        // Adds to the notes all the fields on which the UI relies.
        let i = 0;
        for (let p of app.vue.notes) {
            p._idx = i++;
        }
    };
    
    app.do_edit = (note_idx) => {
        // Handler for button that starts the edit.
        let p = app.vue.notes[note_idx];
        let in_edit = false;
        for (let note of app.vue.notes) {
            if (note.edit === true){
                in_edit = true;
            }
        }
        if(!in_edit){
            let p = app.vue.notes[note_idx];
            p.edit = true;
            p.is_pending = false;
        }    
    };
    
    app.do_cancel = (note_idx) => {
        // Handler for button that cancels the edit.
        let p = app.vue.notes[note_idx];
        if (p.id === null) {
            // If the note has not been saved yet, we delete it.
            app.vue.notes.splice(note_idx, 1);
            app.reindex();
        } else {
            // We go back to before the edit.
            p.edit = false;
            p.is_pending = false;
            p.title_content = p.original_title_content;
            p.body_content = p.original_body_content;
        }
    }
    
    app.do_save = (note_idx) => {
        // Handler for "Save edit" button.
        let p = app.vue.notes[note_idx];
        if (p.title_content !== p.server_title_content || p.body_content !== p.server_body_content ) {
            p.is_pending = true;
            axios.post(notes_url, {
                title_content: p.title_content,
                body_content: p.body_content,
                id: p.id,
                color: p.color,
            }).then((result) => {
                console.log("Received:", result.data);
                p.id = result.data.id;
                p.title_content = result.data.title_content;
                p.server_title_content = p.title_content;
                p.original_title_content = p.title_content;
                p.body_content = result.data.body_content;
                p.server_body_content = p.body_content;
                p.original_body_content = p.body_content;
                p.is_pending = false;
                p.edit = false;
                app.modified_notes(note_idx);
            }).catch(() => {
                console.log("Caught error");
                p.is_pending = false;
                // We stay in edit mode.
            });
        } else {
            // No need to save.
            p.edit = false;
            p.original_title_content = p.title_content;
            p.original_body_content = p.body_content;
        }
    }
    
    app.add_note = () => {
        let q = {
            id: null,
            edit: true,
            title_content: "",
            server_title_content: null,
            original_title_content: "",
            body_content: "",
            server_body_content: null,
            original_body_content: "",
            is_pending: false,
            star: -1,
            color: 'white'
        };
        app.vue.notes.unshift(q);
        app.reindex();
    };
    
    app.do_delete = (note_idx) => {
        let p = app.vue.notes[note_idx];
        if (p.id === null) {
            app.vue.notes.splice(note_idx, 1);
        } else {
            // TODO: Deletes it on the server.
            axios.post(delete_url, {id: p.id}).then(() => {
                app.vue.notes.splice(note_idx, 1);
            })
        }
        app.reindex(app.vue.notes);
        
    };
    
    app.do_star = (note_idx) => {
        let p = app.vue.notes[note_idx];
        p.star = p.star * -1;
        axios.post(star_url, {id: p.id ,star: p.star});
        app.modified_notes(note_idx);
        
    };
    
    app.do_color = (note_idx, color) => {
        let p = app.vue.notes[note_idx];
        p.color = color;
        axios.post(color_url, {id: p.id ,color: p.color});
        //app.modified_notes(note_idx);
    };
    
    app.modified_notes = (note_idx) => {
        let p = app.vue.notes[note_idx];
        if(p.star === 1){
            app.vue.notes.splice(note_idx, 1);
            app.vue.notes.unshift(p);
        }
        else if(p.star === -1){
            app.vue.notes.splice(note_idx, 1);
            let insertion_idx =( (app.vue.notes.findIndex(i => i.star === -1)));
            if(insertion_idx === -1){
                app.vue.notes.push(p);
            }
            else {
                app.vue.notes.splice(insertion_idx,0,p);
            }
        }
        app.reindex(app.vue.notes);
    };
    
    // We form the dictionary of all methods, so we can assign them
    // to the Vue app in a single blow.
    app.methods = {
        do_delete: app.do_delete,
        do_edit: app.do_edit,
        do_cancel: app.do_cancel,
        do_save: app.do_save,
        add_note: app.add_note,
        do_star: app.do_star,
        do_color: app.do_color,
    };

    // This creates the Vue instance.
    app.vue = new Vue({
        el: "#vue-target",
        data: app.data,
        methods: app.methods
    });

    // And this initializes it.
    app.init = () => {
        axios.get(notes_url).then((result) => {
            console.log(result.data.starred_notes);
            console.log(result.data.unstarred_notes);
            stars = result.data.starred_notes;
            unstars = result.data.unstarred_notes;
            temp = stars.concat(unstars);
            app.vue.notes = app.index(temp);
        });
    };

    // Call to the initializer.
    app.init();
};

// This takes the (empty) app object, and initializes it,
// putting all the code i
init(app);
