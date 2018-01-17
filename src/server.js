
var properties = PropertiesService.getScriptProperties();

function get_property(key) {
    value = properties.getProperty(key);

    if (value == null || questions_spreadsheet_id == "") {
        Logger.log("Warning: Properties have not been set up or are empty");
        Logger.log("Plase run the setupProperties function and fill in all the properties");
    }

    return value;
}

var questions_spreadsheet_id = get_property("Questions spreadsheet ID");
var test_template_form_id    = get_property("Test template form ID");
var test_folder_id           = get_property("Test folder ID");
var responses_spreadsheet_id = get_property("Responses spreadsheet ID");
var log_spreadsheet_id       = get_property("Log spreadsheet ID");
var test_generate_form_id    = get_property("Test generate form ID");
var test_request_form_id     = get_property("Test request form ID");
var certificate_template_id  = get_property("Certificate template ID");
var certificate_folder_id    = get_property("Certificate folder ID");

function setupProperties() {
    properties.setProperties({
        "Questions spreadsheet ID": "",
        "Test template form ID": "",
        "Test folder ID": "",
        "Responses spreadsheet ID": "",
        "Log spreadsheet ID": "",
        "Test generate form ID": "",
        "Test request form ID": "",
        "Certificate template ID": "",
        "Certificate folder ID": "",
    }, true);
}

function setupGenerateTests() {
    var test_generate_form = FormApp.openById(test_generate_form_id);
    ScriptApp.newTrigger("onGenerateTests").forForm(test_generate_form).onFormSubmit().create();
}

function setupResponseTests() {
    var test_response_spreadsheet = SpreadsheetApp.openById(responses_spreadsheet_id);
    ScriptApp.newTrigger("onTestFormSubmit").forSpreadsheet(test_response_spreadsheet).onFormSubmit().create();
}

function setupRequestTests() {
    var test_request_form = FormApp.openById(test_request_form_id);
    ScriptApp.newTrigger("onRequestTest").forForm(test_request_form).onFormSubmit().create();
}

function onRequestTest(event) {
    var log_spreadsheet = SpreadsheetApp.openById(log_spreadsheet_id);
    var log_sheet = log_spreadsheet.getSheetByName("Log");
    var log_range = log_sheet.getRange(1, 1, log_sheet.getLastRow(), log_sheet.getLastRow());
    var log_values = log_range.getValues();

    var open_row = null;
    var open_row_index = 0;

    log_values.some(function (row, index) {
        if (row[3] === "Generated") {
            open_row = row;
            open_row_index = index;
            return true;
        } else {
            return false;
        }
    });

    Logger.log(event.response.getRespondentEmail());

    var person = PersonLookup.lookupPerson("Email", event.response.getRespondentEmail());

    if (person == null || person == undefined) {
        if (open_row === null) {
            open_row = [
                "",
                "",
                "",
                "Error: Could not find person for email: " + event.response.getRespondentEmail(),
                event.response.getRespondentEmail(),
            ];

            log_sheet.appendRow(open_row);
        } else {
            log_sheet.getRange(open_row_index + 1, 4).setValue("Error: Could not find person for email: " + event.response.getRespondentEmail());
            log_sheet.getRange(open_row_index + 1, 5).setValue(event.response.getRespondentEmail());
        }
    } else {
        if (open_row === null) {
            // Generate test
            log_sheet.getRange(open_row_index + 1, 4).setValue("Generating");
            var questions_sheet = SpreadsheetApp.openById(questions_spreadsheet_id);
            var questions = parseQuestions(questions_sheet);
            var random_questions = randomizeQuestions(questions);
            var info = generateTest(random_questions);

            open_row = info.concat([
                "Emailed",
                event.response.getRespondentEmail(),
            ]);

            log_sheet.appendRow(open_row);
        } else {
            log_sheet.getRange(open_row_index + 1, 4).setValue("Emailed");
            log_sheet.getRange(open_row_index + 1, 5).setValue(event.response.getRespondentEmail());
        }

        GmailApp.sendEmail(
            event.response.getRespondentEmail(),
            "Safety Test",
            "Hello " + person["First Name"] + "\n"
            + "\n"
            + "Here is your safety test: \n" + open_row[2] + "\n"
            + "\n"
            + "\n"
            + " - The ECE Gods"
        );
    }
}

function onGenerateTests(event) {

    var responses = event.response.getItemResponses();

    var tests_to_generate = 0;

    responses.forEach(function (response) {
        if (response.getItem().getTitle() === "Tests to generate") {
            tests_to_generate = response.getResponse();
        }
    });

    Logger.log("Generating tests: " + tests_to_generate);

    var spreadsheet = SpreadsheetApp.openById(log_spreadsheet_id);
    var sheet = spreadsheet.getSheetByName("Log");

    var questions_sheet = SpreadsheetApp.openById(questions_spreadsheet_id);

    // Make into JSON so that eash test uses a deep clone of the questions array
    var questions = JSON.stringify(parseQuestions(questions_sheet));

    for (var i = 0; i < tests_to_generate; i++) {
        Logger.log("Generating test: " + i);
        var log_row = sheet.getLastRow() + 1;

        sheet.getRange(log_row, 4).setValue("Generating");

        var random_questions = randomizeQuestions(JSON.parse(questions));

        var info = generateTest(random_questions);

        sheet.getRange(log_row, 1).setValue(info[0]);
        sheet.getRange(log_row, 2).setValue(info[1]);
        sheet.getRange(log_row, 3).setValue(info[2]);
        sheet.getRange(log_row, 4).setValue("Generated");

        Logger.log("Generated");
    }
}


function parseQuestions(questions_spreadsheet) {
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

                //Logger.log(row);

                return {
                    text: row[0],
                    answers: row.slice(2, 6).map(function (answer, index) {

                        /*
                         *  {
                         *      text: The text of the answer
                         *      correct: whether this is the correct answer
                         *  }
                         */

                        //Logger.log(answer + " " + index + " " + row[1] + " " + (index === row[1] - 1));

                        return {
                            text: answer,
                            correct: index === row[1] - 1
                        };
                    })
                };
            })
        };
    });
}

function randomizeQuestions(questions) {
    var randomized_questions = questions.reduce(function (randomized_questions, category) {


        // Shuffle the answers of the questions
        category.questions.forEach(function (question) {
            shuffleArray(question.answers);
        });

        shuffleArray(category.questions);

        return randomized_questions.concat(category.questions.splice(0, category.desired_questions));

    }, []);

    shuffleArray(randomized_questions);

    return randomized_questions;
}

function generateTest(questions) {

    var form_template_file = DriveApp.getFileById(test_template_form_id);
    var form_folder = DriveApp.getFolderById(test_folder_id);
    var form_file = form_template_file.makeCopy(form_folder);

    var form = FormApp.openById(form_file.getId());

    form.setIsQuiz(true);
    form.setLimitOneResponsePerUser(true);
    form.setRequireLogin(true);
    form.setShowLinkToRespondAgain(false);
    form.setAcceptingResponses(true);
    form.setDestination(FormApp.DestinationType.SPREADSHEET, responses_spreadsheet_id);

    questions.forEach(function (question) {
        var item = form.addMultipleChoiceItem();
        item.setRequired(true);
        item.setPoints(1);
        item.setTitle(question.text);
        item.setChoices(question.answers.map(function (answer) {
            return item.createChoice(answer.text, answer.correct);
        }));
    });

    return [
        form.getId(),
        form.getEditUrl(),
        form.getPublishedUrl(),
    ];
}

function onTestFormSubmit(event) {
    Logger.log("Submitted");

    //Logger.log(JSON.stringify(event));

    var form_url = event.range.getSheet().getFormUrl();
    //Logger.log(form_url);

    var spreadsheet = SpreadsheetApp.openById(log_spreadsheet_id);
    var sheet = spreadsheet.getSheetByName("Log");
    var range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
    var values = range.getValues();

    var row_number = 0;

    var form_id = form_url.match(/d\/([^/]+)\/viewform/)[1];
    //Logger.log(form_id);

    values.forEach(function (row, index) {
        //Logger.log(row);
        //Logger.log(typeof row[0]);
        if (row[0] === form_id) {
            row_number = index;
            //Logger.log("Found id");
        }
    });

    //Logger.log(row_number);

    var form_id = values[row_number][0];

    //Logger.log(form_id);

    var form = FormApp.openById(form_id);
    //Logger.log(JSON.stringify(form));
    //Logger.log(form);

    form.setAcceptingResponses(false);

    var response_values = event.namedValues;

    var string_score = response_values['Score'][0];
    var points = string_score.split(" / ");
    var score = points[0] / points[1];
    var passed = score >= 0.8;

    var timestamp = response_values['Timestamp'][0];
    var email = response_values['Email Address'][0];
    var ece_class = response_values['Class'][0];
    var section = response_values['Section'][0];

    var person = PersonLookup.lookupPerson("Email", email);
    var first_name = person["First Name"];
    var last_name = person["Last Name"];
    var banner_id = person["Banner ID"];
    var department = person["Department"];

    sheet.getRange(row_number + 1, 4).setValue("Response Received");
    sheet.getRange(row_number + 1, 6).setValue(timestamp);
    sheet.getRange(row_number + 1, 7).setValue(email);
    sheet.getRange(row_number + 1, 8).setValue(first_name);
    sheet.getRange(row_number + 1, 9).setValue(last_name);
    sheet.getRange(row_number + 1, 10).setValue(score);
    sheet.getRange(row_number + 1, 11).setValue(passed);
    sheet.getRange(row_number + 1, 12).setValue(ece_class);
    sheet.getRange(row_number + 1, 13).setValue(section);

    var questions_spreadsheet = SpreadsheetApp.openById(QUESTIONS_SPREADSHEET_ID);

    questions_spreadsheet.getSheets().forEach(function (sheet) {
        var range = sheet.getRange(4, 1, sheet.getLastRow(), sheet.getLastColumn());
        var values = range.getValues();

        values.forEach(function (row, index) {
            // Go over each question to see if this is the one
            var row_question = row[0];
            var correct_number = row[1];
            var correct_answer = row[1 + correct_number];

            var total_count_range = sheet.getRange(index + 4, 8);
            var correct_count_range = sheet.getRange(index + 4, 7);

            for (current_question in response_values) {
                if (current_question === row_question) {
                    total_count_range.setValue(total_count_range.getValue() + 1);
                    //Logger.log(response_values[current_question][0] + " " + correct_answer);
                    if (response_values[current_question][0] === correct_answer) {
                        correct_count_range.setValue(correct_count_range.getValue() + 1);
                    }
                }
            }
        });
    });

    if (passed) {
        // Generate certificate and email it
        var copyFile = DriveApp.getFileById(certificate_template_id).makeCopy();
        var copyId = copyFile.getId();
        var copyDoc = DocumentApp.openById(copyId);
        var copyBody = copyDoc.getActiveSection();

        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth()+1; //January is 0!
        var yyyy = today.getFullYear();

        if(dd<10) {
          dd = '0'+dd
        }

        if(mm<10) {
          mm = '0'+mm
        }

        var date = mm + '/' + dd + '/' + yyyy;

        copyBody.replaceText('<<FirstName>>', first_name);
        copyBody.replaceText('<<LastName>>', last_name);
        copyBody.replaceText('<<BannerID>>', banner_id);
        copyBody.replaceText('<<Email>>', email);
        copyBody.replaceText('<<Department>>', department);
        copyBody.replaceText('<<ClassCode>>', ece_class);
        copyBody.replaceText('<<Section>>', section);
        copyBody.replaceText('<<CompletionDate>>', date);
        copyBody.replaceText('<<CalculatedScore>>', score*100);

        copyDoc.saveAndClose();

        var pdf = DriveApp.createFile(copyFile.getAs('application/pdf'));

        copyFile.setTrashed(true);

        var folder = DriveApp.getFolderById(certificate_folder_id);

        folder.addFile(pdf);

        pdf.setName(banner_id + "_" + last_name + "_" + date);

        GmailApp.sendEmail(
            email,
            "ECE Safety Training Certificate",
            "Hello " + first_name + ",\n" +
            "\n" +
            "Attatched is your safety training certificate\n" +
            "\n" +
            "\n" +
            " - The ECE Gods",
            {attachments: [pdf]}
        );

    }
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
    var questions_spreadsheet = SpreadsheetApp.openById(QUESTIONS_SPREADSHEET_ID);

    var questions = parseQuestions(questions_spreadsheet);
    Logger.log(JSON.stringify(questions, null, 2));

    var random_questions = randomizeQuestions(questions);
    Logger.log(JSON.stringify(random_questions, null, 2));

    generateTest("Testy Testing", random_questions);
}

