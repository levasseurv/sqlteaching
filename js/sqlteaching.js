let sql = window.SQL;
// The db letiable gets set every time a level is loaded.
let db, levels, current_level, current_level_name;

/* *******************************************************************************************

Functions

********************************************************************************************** */

// Return an HTML table as a string, given SQL.js results
function table_from_results(res) {
    let table_string = '<table class="table">';
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
        is_correct_html = 'Congrats!  That is correct!<br/>';
        if (current_level < levels.length) {
            is_correct_html += '<a href="#!' + levels[current_level]['short_name'] + '" tabindex="3">Next Lesson</a>';
        } else {
            is_correct_html += 'That is currently the end of the tutorial.  Please check back later for more!';
        }
        $('#answer-correct').html(is_correct_html).show();
        $('#answer-wrong').hide();
    } else if (custom_error_message) {
        $('#answer-wrong').text(custom_error_message).show();
        $('#answer-correct').hide();
    } else {
        $('#answer-wrong').text('That was incorrect.  Please try again.').show();
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
            show_is_correct(false, 'The query you have entered did not return any results.  Please try again.');
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
                show_is_correct(false, 'The query you have entered did not return the proper results.  Please try again.');
            }
        }
    } catch (err) {
        $('#results').html('');
        show_is_correct(false, 'The query you have entered is not valid.  Please try again.');
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
        case 'family':
            sqlstr = "CREATE TABLE family_members (id int, nom char, genre char, espece char, lus int);";
            sqlstr += "INSERT INTO family_members VALUES (1, 'Dave', 'male', 'human', 200);";
            sqlstr += "INSERT INTO family_members VALUES (2, 'Mary', 'female', 'human', 180);";
            sqlstr += "INSERT INTO family_members VALUES (3, 'Pickles', 'male', 'dog', 0);";
            table_names = ['family_members'];
            break;
        case 'friends_of_pickles':
            sqlstr = "CREATE TABLE friends_of_pickles (id int, name char, gender char, species char, height_cm int);";
            sqlstr += "INSERT INTO friends_of_pickles VALUES (1, 'Dave', 'male', 'human', 180);";
            sqlstr += "INSERT INTO friends_of_pickles VALUES (2, 'Mary', 'female', 'human', 160);";
            sqlstr += "INSERT INTO friends_of_pickles VALUES (3, 'Fry', 'male', 'cat', 30);";
            sqlstr += "INSERT INTO friends_of_pickles VALUES (4, 'Leela', 'female', 'cat', 25);";
            sqlstr += "INSERT INTO friends_of_pickles VALUES (5, 'Odie', 'male', 'dog', 40);";
            sqlstr += "INSERT INTO friends_of_pickles VALUES (6, 'Jumpy', 'male', 'dog', 35);";
            sqlstr += "INSERT INTO friends_of_pickles VALUES (7, 'Sneakers', 'male', 'dog', 55);";
            table_names = ['friends_of_pickles'];
            break;
        case 'family_and_legs':
            sqlstr = "CREATE TABLE family_members (id int, name char, species char, num_books_read int, num_legs int);";
            sqlstr += "INSERT INTO family_members VALUES (1, 'Dave', 'human', 200, 2);";
            sqlstr += "INSERT INTO family_members VALUES (2, 'Mary', 'human', 180, 2);";
            sqlstr += "INSERT INTO family_members VALUES (3, 'Pickles', 'dog', 0, 4);";
            table_names = ['family_members'];
            break;
        case 'family_null':
            sqlstr = "CREATE TABLE family_members (id int, name char, gender char, species char, favorite_book char);";
            sqlstr += "INSERT INTO family_members VALUES (1, 'Dave', 'male', 'human', 'To Kill a Mockingbird');";
            sqlstr += "INSERT INTO family_members VALUES (2, 'Mary', 'female', 'human', 'Gone with the Wind');";
            sqlstr += "INSERT INTO family_members VALUES (3, 'Pickles', 'male', 'dog', NULL);";
            table_names = ['family_members'];
            break;
        case 'celebs_born':
            sqlstr = "CREATE TABLE celebs_born (id int, name char, birthdate date);";
            sqlstr += "INSERT INTO celebs_born VALUES (1, 'Michael Jordan', '1963-02-17');";
            sqlstr += "INSERT INTO celebs_born VALUES (2, 'Justin Timberlake', '1981-01-31');";
            sqlstr += "INSERT INTO celebs_born VALUES (3, 'Taylor Swift', '1989-12-13');";
            table_names = ['celebs_born'];
            break;
        case 'tv':
            sqlstr = "CREATE TABLE character (id int, name char);";
            sqlstr += "INSERT INTO character VALUES (1, 'Doogie Howser');";
            sqlstr += "INSERT INTO character VALUES (2, 'Barney Stinson');";
            sqlstr += "INSERT INTO character VALUES (3, 'Lily Aldrin');";
            sqlstr += "INSERT INTO character VALUES (4, 'Willow Rosenberg');";
            sqlstr += "CREATE TABLE character_tv_show (id int, character_id int, tv_show_name char);";
            sqlstr += "INSERT INTO character_tv_show VALUES (1, 4, 'Buffy the Vampire Slayer');";
            sqlstr += "INSERT INTO character_tv_show VALUES (2, 3, 'How I Met Your Mother');";
            sqlstr += "INSERT INTO character_tv_show VALUES (3, 2, 'How I Met Your Mother');";
            sqlstr += "INSERT INTO character_tv_show VALUES (4, 1, 'Doogie Howser, M.D.');";
            sqlstr += "CREATE TABLE character_actor (id int, character_id int, actor_name char);";
            sqlstr += "INSERT INTO character_actor VALUES (1, 4, 'Alyson Hannigan');";
            sqlstr += "INSERT INTO character_actor VALUES (2, 3, 'Alyson Hannigan');";
            sqlstr += "INSERT INTO character_actor VALUES (3, 2, 'Neil Patrick Harris');";
            sqlstr += "INSERT INTO character_actor VALUES (4, 1, 'Neil Patrick Harris');";
            table_names = ['character', 'character_tv_show', 'character_actor'];
            break;
        case 'tv_normalized':
            sqlstr = "CREATE TABLE character (id int, name char);";
            sqlstr += "INSERT INTO character VALUES (1, 'Doogie Howser');";
            sqlstr += "INSERT INTO character VALUES (2, 'Barney Stinson');";
            sqlstr += "INSERT INTO character VALUES (3, 'Lily Aldrin');";
            sqlstr += "INSERT INTO character VALUES (4, 'Willow Rosenberg');";
            sqlstr += "CREATE TABLE tv_show (id int, name char);";
            sqlstr += "INSERT INTO tv_show VALUES (1, 'Buffy the Vampire Slayer');";
            sqlstr += "INSERT INTO tv_show VALUES (2, 'How I Met Your Mother');";
            sqlstr += "INSERT INTO tv_show VALUES (3, 'Doogie Howser, M.D.');";
            sqlstr += "CREATE TABLE character_tv_show (id int, character_id int, tv_show_id int);";
            sqlstr += "INSERT INTO character_tv_show VALUES (1, 1, 3);";
            sqlstr += "INSERT INTO character_tv_show VALUES (2, 2, 2);";
            sqlstr += "INSERT INTO character_tv_show VALUES (3, 3, 2);";
            sqlstr += "INSERT INTO character_tv_show VALUES (4, 4, 1);";
            sqlstr += "CREATE TABLE actor (id int, name char);";
            sqlstr += "INSERT INTO actor VALUES (1, 'Alyson Hannigan');";
            sqlstr += "INSERT INTO actor VALUES (2, 'Neil Patrick Harris');";
            sqlstr += "CREATE TABLE character_actor (id int, character_id int, actor_id int);";
            sqlstr += "INSERT INTO character_actor VALUES (1, 1, 2);";
            sqlstr += "INSERT INTO character_actor VALUES (2, 2, 2);";
            sqlstr += "INSERT INTO character_actor VALUES (3, 3, 1);";
            sqlstr += "INSERT INTO character_actor VALUES (4, 4, 1);";
            table_names = ['character', 'tv_show', 'character_tv_show', 'actor', 'character_actor'];
            break;
        case 'tv_extra':
            sqlstr = "CREATE TABLE character (id int, name char);";
            sqlstr += "INSERT INTO character VALUES (1, 'Doogie Howser');";
            sqlstr += "INSERT INTO character VALUES (2, 'Barney Stinson');";
            sqlstr += "INSERT INTO character VALUES (3, 'Lily Aldrin');";
            sqlstr += "INSERT INTO character VALUES (4, 'Willow Rosenberg');";
            sqlstr += "INSERT INTO character VALUES (5, 'Steve Urkel');";
            sqlstr += "INSERT INTO character VALUES (6, 'Homer Simpson');";
            sqlstr += "CREATE TABLE tv_show (id int, name char);";
            sqlstr += "INSERT INTO tv_show VALUES (1, 'Buffy the Vampire Slayer');";
            sqlstr += "INSERT INTO tv_show VALUES (2, 'How I Met Your Mother');";
            sqlstr += "INSERT INTO tv_show VALUES (3, 'Doogie Howser, M.D.');";
            sqlstr += "INSERT INTO tv_show VALUES (4, 'Friends');";
            sqlstr += "CREATE TABLE character_tv_show (id int, character_id int, tv_show_id int);";
            sqlstr += "INSERT INTO character_tv_show VALUES (1, 1, 3);";
            sqlstr += "INSERT INTO character_tv_show VALUES (2, 2, 2);";
            sqlstr += "INSERT INTO character_tv_show VALUES (3, 3, 2);";
            sqlstr += "INSERT INTO character_tv_show VALUES (4, 4, 1);";
            sqlstr += "CREATE TABLE actor (id int, name char);";
            sqlstr += "INSERT INTO actor VALUES (1, 'Alyson Hannigan');";
            sqlstr += "INSERT INTO actor VALUES (2, 'Neil Patrick Harris');";
            sqlstr += "INSERT INTO actor VALUES (3, 'Adam Sandler');";
            sqlstr += "INSERT INTO actor VALUES (4, 'Steve Carell');";
            sqlstr += "CREATE TABLE character_actor (id int, character_id int, actor_id int);";
            sqlstr += "INSERT INTO character_actor VALUES (1, 1, 2);";
            sqlstr += "INSERT INTO character_actor VALUES (2, 2, 2);";
            sqlstr += "INSERT INTO character_actor VALUES (3, 3, 1);";
            sqlstr += "INSERT INTO character_actor VALUES (4, 4, 1);";
            table_names = ['character', 'tv_show', 'character_tv_show', 'actor', 'character_actor'];
            break;
        case 'self_join':
            sqlstr = "CREATE TABLE rps (id int, name char, defeats_id int);";
            sqlstr += "INSERT INTO rps VALUES (1, 'Rock', 3);";
            sqlstr += "INSERT INTO rps VALUES (2, 'Paper', 1);";
            sqlstr += "INSERT INTO rps VALUES (3, 'Scissors', 2);";
            sqlstr += "CREATE TABLE employees (id int, name char, title char, boss_id int);";
            sqlstr += "INSERT INTO employees VALUES (1, 'Patrick Smith', 'Software Engineer', 2);";
            sqlstr += "INSERT INTO employees VALUES (2, 'Abigail Reed', 'Engineering Manager', 3);";
            sqlstr += "INSERT INTO employees VALUES (3, 'Bob Carey', 'Director of Engineering', 4);";
            sqlstr += "INSERT INTO employees VALUES (4, 'Maxine Tang', 'CEO', null);";
            table_names = ['rps', 'employees'];
            break;
        case 'robot':
            sqlstr = "CREATE TABLE robots (id int, name char);";
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
            sqlstr = "CREATE TABLE robots (id int, name char, location char);";
            sqlstr += "INSERT INTO robots VALUES (1, 'R2000 - Robot 2000', 'New City, NY');";
            sqlstr += "INSERT INTO robots VALUES (2, 'R2001 - Champion Robot 2001', 'Palo Alto, CA');";
            sqlstr += "INSERT INTO robots VALUES (3, 'D0001 - Dragon', 'New York City, NY');";
            sqlstr += "INSERT INTO robots VALUES (4, 'R2002 - Turbo Robot 2002', 'Spring Valley, NY');";
            sqlstr += "INSERT INTO robots VALUES (5, 'R2003 - Super Robot 2003', 'Nyack, NY');";
            sqlstr += "INSERT INTO robots VALUES (6, 'R2004 - Super Turbo Robot 2004', 'Tampa, FL');";
            sqlstr += "INSERT INTO robots VALUES (7, 'N0001 - Not A Robot', 'Seattle, WA');";
            sqlstr += "INSERT INTO robots VALUES (8, 'U2111 - Unreleased Turbo Robot 2111', 'Buffalo, NY');";
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


let load_level = function (hash_code = "select") {

    // The current level is 1 by default, unless the hash code matches the short name for a level.
    current_level = 1;
    for (let index in levels) {
        if (hash_code == levels[index]['short_name']) {
            current_level = parseInt(index, 10) + 1;
            break;
        }
    }
    let database = load_database(levels[current_level - 1]['database_type']);
    // Set text for current level
    lesson_name = levels[current_level - 1]['name'];
    $('#lesson-name').text("Lesson " + current_level + ": " + lesson_name);
    $('#info').html(levels[current_level - 1]['info']);
    $('#prompt').html(levels[current_level - 1]['prompt']);

    // Add "next" and "previous" links if it makes sense.
    if (current_level > 1) {
        $('#previous-link').attr('href', '#!' + levels[current_level - 2]['short_name']).show();
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
  levels = await $.ajax("js/levels.json");
  db = load_level();
}

/* *******************************************************************************************

Event Handlers

********************************************************************************************** */

// Onclick handler for when you click "Run SQL"
$('#sql-link').click(execute_query);

// Keypress handler for ctrl + enter to "Run SQL"
$('#sql-input').keypress(function (event) {
  let keyCode = (event.which ? event.which : event.keyCode);

  if (keyCode === 10 || keyCode === 13 && event.ctrlKey) {
    execute_query();
    return false;
  }
});

// When the URL after the # changes, we load a new level,
// and let Google Analytics know that the page has changed.
$(window).bind('hashchange', function () {
    db = load_level();
});

init().then();