
function parseQuestions(questions_spreadsheet){
    var questions_spreadsheet_header_rows = 3;
    var questions_desired_locaion = 'B2';

    var category_sheets = questions_spreadsheet.getSheets();

    return category_sheets.map(function (sheet) {

        var range = sheet.getRange(questions_spreadsheet_header_rows + 1, 1, sheet.getLastRow() - questions_spreadsheet_header_rows, sheet.getLastColumn());
        var values = range.getValues();

        /*
         *  {
         *      name: Name of the category
         *      desired_questions: Number of questions that should be on a test from this category
         *      questions: A list of questions that could be on the test
         *  }
         */

        return {
            name: sheet.getName(),
            desired_questions: sheet.getRange(questions_desired_locaion).getValue(),
            questions: values.map(function (row) {

                /*
                 *  {
                 *      text: The text of the question
                 *      answers: A list of answers to the question
                 *  }
                 */

                return {
                    text: row[0],
                    answers: row.splice(2, 6).map(function (question, index) {

                        /*
                         *  {
                         *      text: The text of the answer
                         *      correct: whether this is the correct answer
                         *  }
                         */

                        return {
                            text: question,
                            correct: index === row[1]
                        };
                    })
                };
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
    var questions_spreadsheet_id = "1aMbrM9llf225flyTBc6VYilygD1UVqzncORPnOlxGws";
    var questions_spreadsheet = SpreadsheetApp.openById(questions_spreadsheet_id);

    var questions = parseQuestions(questions_spreadsheet);
    Logger.log(JSON.stringify(questions, null, 2));
}

