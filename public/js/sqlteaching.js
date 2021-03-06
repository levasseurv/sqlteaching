let sql = window.SQL;
// The db letiable gets set every time a level is loaded.
let db, levels, current_level, current_level_name;

/* *******************************************************************************************

Functions

********************************************************************************************** */

// Return an HTML table as a string, given SQL.js results
function table_from_results(res) {
    let table_string = '<table class="table table-sm table-responsive-md col-md-3 mr-auto">';
    if (res) {
        table_string += '<thead class="thead-dark"><tr>';
        for (let index in res[0].columns) {
            table_string += '<th>' + res[0].columns[index] + '</th>';
        }
        table_string += '</tr></thead><tbody>';
        for (let row_index in res[0].values) {
            table_string += '<tr>';
            for (let col_index in res[0].values[row_index]) {
                table_string += '<td>' + res[0].values[row_index][col_index] + '</td>';
            }
            table_string += '</tr>';
        }
    }
    table_string += '</tbody></table>';
    return table_string;
}

let grade_results = function (results, correct_answer) {
    if (!results) {
        return false;
    }

    // Check to make sure the results are equal, but normalize case and remove whitespace from column names.
    let normalize = function (x) {
        return x.toUpperCase().replace(/\s/g, "")
    };
    return JSON.stringify(results[0].columns.map(normalize)) === JSON.stringify(correct_answer.columns.map(normalize)) &&
        JSON.stringify(results[0].values) === JSON.stringify(correct_answer.values);
};

let show_is_correct = function (is_correct, custom_error_message) {
    if (is_correct) {
        is_correct_html = 'Félicitations vous avez réussi cet exercice !<br/>';
        if (current_level < levels.length) {
            is_correct_html += '<a tabindex="3" href="#!' +  levels[current_level]['short_name'] + '" id="next">Passer au prochain exercice <span class="text-muted small"><kbd>CTRL</kbd> + <kbd>&rarr;</kbd></span></a>';
        } else {
            is_correct_html += "C'était le dernier exercice ! Félicitations :)";
        }
        $('#answer-correct').html(is_correct_html).show();
        $('#answer-wrong').hide();
    } else if (custom_error_message) {
        $('#answer-wrong').text(custom_error_message).show();
        $('#answer-correct').hide();
    } else {
        $('#answer-wrong').text('Les résultats obtenus ne correspondent pas aux résultats attendus. Veuillez réessayer.').show();
        $('#answer-correct').hide();
    }
};

let strings_present = function (strings) {
    let ans = $('#sql-input').val().toLowerCase();
    for (let index in strings) {
        if (ans.indexOf(strings[index].toLowerCase()) < 0) {
            return false;
        }
    }
    return true;
};

let execute_query = function () {
    let cur_level = levels[current_level - 1];
    let correct_answer = cur_level['answer'];
    try {
        let results = db.exec($('#sql-input').val());
        if (results.length === 0) {
            $('#results').html('');
            show_is_correct(false, "Malheureusement la requête n'a retourné aucun résultat.");
        } else {
            $('#results').html(table_from_results(results));
            let is_correct = grade_results(results, correct_answer);
            if (is_correct) {
                // The required strings are optional, but if they exist and it fails, we show a custom error message.
                if (!cur_level['required'] || strings_present(cur_level['required'])) {
                    show_is_correct(true, null);
                    localStorage.setItem('completed-' + cur_level['short_name'], 'correct');
                    // By calling render_menu, the completed level gets a checkmark added
                    // render_menu();
                } else {
                    show_is_correct(false, cur_level['custom_error_message']);
                }
            } else {
                show_is_correct(false, 'Les résultats obtenus ne correspondent pas aux résultats attendus. Veuillez réessayer.');
            }
        }
    } catch (err) {
        $('#results').html('');
        show_is_correct(false, " La requête n'est pas valide : «"+err+ "». Veuillez recommencer et vérifier que les tables et les champs existent dans les tables courantes de l'exercice.");
    }
    $('.expected-results-container').show();
    $('#expected-results').html(table_from_results([correct_answer]));
    return false;
};

// Create the SQL database
let load_database = function (db_type) {
    let database, sqlstr, table_names;
    database = new sql.Database();
    switch (db_type) {
        case 'famille':
            sqlstr = "CREATE TABLE famille (id int, nom char, livres_lus int);";
            sqlstr += "INSERT INTO famille VALUES (1, 'Dave', 200);";
            sqlstr += "INSERT INTO famille VALUES (2, 'Marie', 180);";
            sqlstr += "INSERT INTO famille VALUES (3, 'Chaton', 0);";
            table_names = ['famille'];
            break;
        case 'amis_chaton':
            sqlstr = "CREATE TABLE amis_chaton (id int, nom char, type char, taille_cm float);";
            sqlstr += "INSERT INTO amis_chaton VALUES (1, 'Dave', 'humain', 180);";
            sqlstr += "INSERT INTO amis_chaton VALUES (2, 'Marie', 'humain', 160);";
            sqlstr += "INSERT INTO amis_chaton VALUES (3, 'Frisou', 'chat', 30);";
            sqlstr += "INSERT INTO amis_chaton VALUES (4, 'Leela', 'chat', 25);";
            sqlstr += "INSERT INTO amis_chaton VALUES (5, 'Odie', 'chien', 40);";
            sqlstr += "INSERT INTO amis_chaton VALUES (6, 'Pitou','chien', 35);";
            sqlstr += "INSERT INTO amis_chaton VALUES (7, 'Jojo', 'chien', 55);";
            table_names = ['amis_chaton'];
            break;
        case 'family_and_legs':
            sqlstr = "CREATE TABLE famille (id int, nom char, livres_lus int, nb_jambes int);";
            sqlstr += "INSERT INTO famille VALUES (1, 'Dave', 200,2);";
            sqlstr += "INSERT INTO famille VALUES (2, 'Marie', 180,2);";
            sqlstr += "INSERT INTO famille VALUES (3, 'Chaton', 0,4);";
            table_names = ['famille'];
            break;
        case 'family_null':
            sqlstr = "CREATE TABLE family_members (id int, nom char, gender char, type char, favorite_book char);";
            sqlstr += "INSERT INTO family_members VALUES (1, 'Dave', 'male', 'humain', 'To Kill a Mockingbird');";
            sqlstr += "INSERT INTO family_members VALUES (2, 'Marie', 'female', 'humain', 'Gone with the Wind');";
            sqlstr += "INSERT INTO family_members VALUES (3, 'Pickles', 'male', 'chien', NULL);";
            table_names = ['family_members'];
            break;
        case 'celebs_born':
            sqlstr = "CREATE TABLE celebrites_ddn (id int, nom char, ddn date);";
            sqlstr += "INSERT INTO celebrites_ddn VALUES (1, 'Michael Jordan', '1963-02-17');";
            sqlstr += "INSERT INTO celebrites_ddn VALUES (2, 'Justin Timberlake', '1981-01-31');";
            sqlstr += "INSERT INTO celebrites_ddn VALUES (3, 'Taylor Swift', '1989-12-13');";
            table_names = ['celebrites_ddn'];
            break;
        case 'tv':
            sqlstr = "CREATE TABLE personnages (id int, nom char);";
            sqlstr += "INSERT INTO personnages VALUES (1, 'Doogie Howser');";
            sqlstr += "INSERT INTO personnages VALUES (2, 'Barney Stinson');";
            sqlstr += "INSERT INTO personnages VALUES (3, 'Lily Aldrin');";
            sqlstr += "INSERT INTO personnages VALUES (4, 'Willow Rosenberg');";
            sqlstr += "CREATE TABLE perso_emission (id int, perso_id int, nom_emission char);";
            sqlstr += "INSERT INTO perso_emission VALUES (1, 4, 'Buffy the Vampire Slayer');";
            sqlstr += "INSERT INTO perso_emission VALUES (2, 3, 'How I Met Your Mother');";
            sqlstr += "INSERT INTO perso_emission VALUES (3, 2, 'How I Met Your Mother');";
            sqlstr += "INSERT INTO perso_emission VALUES (4, 1, 'Doogie Howser, M.D.');";
            sqlstr += "CREATE TABLE perso_acteur (id int, perso_id int, nom_acteur char);";
            sqlstr += "INSERT INTO perso_acteur VALUES (1, 4, 'Alyson Hannigan');";
            sqlstr += "INSERT INTO perso_acteur VALUES (2, 3, 'Alyson Hannigan');";
            sqlstr += "INSERT INTO perso_acteur VALUES (3, 2, 'Neil Patrick Harris');";
            sqlstr += "INSERT INTO perso_acteur VALUES (4, 1, 'Neil Patrick Harris');";
            table_names = ['personnages', 'perso_emission', 'perso_acteur'];
            break;
        case 'tv_extra':
            sqlstr = "CREATE TABLE personnages (id int, nom char);";
            sqlstr += "INSERT INTO personnages VALUES (1, 'Doogie Howser');";
            sqlstr += "INSERT INTO personnages VALUES (2, 'Barney Stinson');";
            sqlstr += "INSERT INTO personnages VALUES (3, 'Lily Aldrin');";
            sqlstr += "INSERT INTO personnages VALUES (4, 'Willow Rosenberg');";
            sqlstr += "INSERT INTO personnages VALUES (5, 'Steve Urkel');";
            sqlstr += "INSERT INTO personnages VALUES (6, 'Homer Simpson');";
            sqlstr += "CREATE TABLE perso_emission (id int, perso_id int, nom_emission char);";
            sqlstr += "INSERT INTO perso_emission VALUES (1, 4, 'Buffy the Vampire Slayer');";
            sqlstr += "INSERT INTO perso_emission VALUES (2, 3, 'How I Met Your Mother');";
            sqlstr += "INSERT INTO perso_emission VALUES (3, 2, 'How I Met Your Mother');";
            sqlstr += "INSERT INTO perso_emission VALUES (4, 1, 'Doogie Howser, M.D.');";
            sqlstr += "CREATE TABLE perso_acteur (id int, perso_id int, nom_acteur char);";
            sqlstr += "INSERT INTO perso_acteur VALUES (1, 4, 'Alyson Hannigan');";
            sqlstr += "INSERT INTO perso_acteur VALUES (2, 3, 'Alyson Hannigan');";
            sqlstr += "INSERT INTO perso_acteur VALUES (3, 2, 'Neil Patrick Harris');";
            sqlstr += "INSERT INTO perso_acteur VALUES (4, 1, 'Neil Patrick Harris');";
            table_names = ['personnages', 'perso_emission', 'perso_acteur'];
            break;
        case 'self_join':
            sqlstr = "CREATE TABLE employes (id int, nom char, role char, superviseur_id int);";
            sqlstr += "INSERT INTO employes VALUES (1, 'Patrick Smith', 'Stagiaire', 2);";
            sqlstr += "INSERT INTO employes VALUES (2, 'Abigail Reed', 'Employé', 3);";
            sqlstr += "INSERT INTO employes VALUES (3, 'Bob Carey', 'Directeur régional', 4);";
            sqlstr += "INSERT INTO employes VALUES (4, 'Maxine Tang', 'Président', null);";
            table_names = ['employes'];
            break;
        case 'robot':
            sqlstr = "CREATE TABLE robots (id int, nom char);";
            sqlstr += "INSERT INTO robots VALUES (1, 'Robot 2000');";
            sqlstr += "INSERT INTO robots VALUES (2, 'Champion Robot 2001');";
            sqlstr += "INSERT INTO robots VALUES (3, 'Dragon');";
            sqlstr += "INSERT INTO robots VALUES (4, 'Turbo Robot 2002');";
            sqlstr += "INSERT INTO robots VALUES (5, 'Super Robot 2003');";
            sqlstr += "INSERT INTO robots VALUES (6, 'Super Turbo Robot 2004');";
            sqlstr += "INSERT INTO robots VALUES (7, 'Not A Robot');";
            sqlstr += "INSERT INTO robots VALUES (8, 'Unreleased Turbo Robot 2111');";
            table_names = ['robots'];
            break;
        case 'robot_code':
            sqlstr = "CREATE TABLE robots (id int, nom char, lieu_naissance char);";
            sqlstr += "INSERT INTO robots VALUES (1, 'R2000 - Robot 2000', 'Gatineau, QC');";
            sqlstr += "INSERT INTO robots VALUES (2, 'R2001 - Champion Robot 2001', 'Ottawa, ON');";
            sqlstr += "INSERT INTO robots VALUES (3, 'D0001 - Dragon', 'Trois-Rivières, QC');";
            sqlstr += "INSERT INTO robots VALUES (4, 'R2002 - Turbo Robot 2002', 'Maniwaki, QC');";
            sqlstr += "INSERT INTO robots VALUES (5, 'R2003 - Super Robot 2003', 'Montréal, QC');";
            sqlstr += "INSERT INTO robots VALUES (6, 'R2004 - Super Turbo Robot 2004', 'Toronto, ON');";
            sqlstr += "INSERT INTO robots VALUES (7, 'N0001 - Not A Robot', 'Winnipeg, MB');";
            sqlstr += "INSERT INTO robots VALUES (8, 'U2111 - Unreleased Turbo Robot 2111', 'Lévis, QC');";
            table_names = ['robots'];
            break;
        case 'fighting':
            sqlstr = "CREATE TABLE fighters (id int, name char, gun char, sword char, tank char);";
            sqlstr += "INSERT INTO fighters VALUES (1, 'US Marine', 'Colt 9mm SMG', 'Swiss Army Knife', 'M1A1 Abrams Tank');";
            sqlstr += "INSERT INTO fighters VALUES (2, 'John Wilkes Booth', '.44 caliber Derringer', null, null);";
            sqlstr += "INSERT INTO fighters VALUES (3, 'Zorro', null, 'Sword of Zorro', null);";
            sqlstr += "INSERT INTO fighters VALUES (4, 'Innocent Bystander', null, null, null);";
            table_names = ['fighters'];
            break;
    }

    database.run(sqlstr);

    let current_table_string = '';
    for (let index in table_names) {
        results = database.exec("SELECT * FROM " + table_names[index] + ";");
        current_table_string += '<div class="table-name">' + table_names[index] + '</div>' + table_from_results(results);
    }
    $('#current-tables').html(current_table_string);

    return database;
};

let load_level = function () {
    var hash_code = window.location.hash.substr(2);

    // The current level is 1 by default, unless the hash code matches the short name for a level.
    current_level = levels.findIndex(level => level.short_name == hash_code) +1 || 1;
    let database = load_database(levels[current_level - 1]['database_type']);
    // Set text for current level
    lesson_name = levels[current_level - 1]['name'];
    $('#lesson-name').text("Exercice " + current_level + ": " + lesson_name);
    $('#prompt').html(levels[current_level - 1]['prompt']);

    // Add "next" and "previous" links if it makes sense.
    if (current_level > 1) {
        $('#previous-link').attr('href', '#!' + levels[current_level-2]['short_name']).show();
    } else {
        $('#previous-link').hide();
    }
    if (current_level < levels.length) {
        $('#next-link').attr('href', '#!' + levels[current_level]['short_name']).show();
    } else {
        $('#next-link').hide();
    }

    // Clear out old data
    $('#answer-correct').hide();
    $('#answer-wrong').hide();
    $('#sql-input').val('');
    $('#results').html('');
    $('.expected-results-container').hide();
    return database;
};

/**
 * This letiable has the prompts and answers for each level.
 n
 * It is an array of dictionaries.  In each dictionary, there are the following keys:
 *  - name:          name shown on web page
 *  - short_name:    identifier added to the URL
 *  - database_type: is passed into the load_database function, in order to determine the tables loaded
 *  - answer:        the query that the user writes must return data that matches this value
 *  - info :         information ..... @TODO complete
 *  - prompt:        what is shown to the user in that web page
 *
 * And the following keys are optional:
 *  - required:             Extra validation in the form of case-insensitive required strings
 *  - custom_error_message: If the validation fails, show this error message to the user
 */
async function init() {
  levels = await $.ajax({
      method: "GET",
      url: "js/levels.json",
      dataType: "json"
  });
  db = load_level();
}

/* *******************************************************************************************

Event Handlers

********************************************************************************************** */

// Onclick handler for when you click "Run SQL"
$('#sql-link').click(execute_query);

// Keypress handler for ctrl + enter to "Run SQL"
$('#sql-input').keydown(function(event) {

    //Exécuter la requête
    let keyCode = (event.which ? event.which : event.code);
    if (keyCode === 10 || keyCode === 13 && event.ctrlKey) {
        execute_query();
        return false;
    }

    //Prochain exercice avec CTRL + ->
    if (keyCode === 39 && event.ctrlKey) {
        window.location.hash = $('#next').attr('href');
        return false;
    }
});

// When the URL after the # changes, we load a new level.
$(window).bind('hashchange', function() {
    db = load_level();
});

init().then();