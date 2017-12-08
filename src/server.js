
var questions_spreadsheet_id = "1aMbrM9llf225flyTBc6VYilygD1UVqzncORPnOlxGws";
var questions_spreadsheet = SpreadsheetApp.openById(questions_spreadsheet_id);
var questions_spreadsheet_header_rows = 3;

function parseQuestions(){

    var category_sheets = questions_spreadsheet.getSheets();

    return category_sheets.map(function (sheet) {

        var range = sheet.getRange(questions_spreadsheet_header_rows + 1, 1, sheet.getLastRow() - questions_spreadsheet_header_rows, sheet.getLastColumn());
        var values = range.getValues();

        return {
            name: sheet.getName(),
            questions: values.map(function(row) {
                return {
                    title: row[0],
                    correct: row[1],
                    questions: row.splice(2, 6)
                }
            })
        };
    });
}

// Returns a list of `desired_questions` number of question numbers
// pulled randomly from 0 to `total_questions` - 1
function randomQuestionNumbers(total_questions, desired_questions) {

    var question_numbers = [];

    for(var i = 0; i < total_questions; i++){
        question_numbers.push(i);
    }

    shuffleArray(question_numbers);

    Logger.log(question_numbers);

    return question_numbers.slice(0, desired_questions);
}

/**
 * Randomize array element order in-place.
 * Using Durstenfeld shuffle algorithm.
 * https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
 */
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function tests() {
    var questions = parseQuestions();
    Logger.log(JSON.stringify(questions, null, 2));
}

