
var properties = PropertiesService.getScriptProperties();

function get_property(key) {
    value = properties.getProperty(key);

    if (value == null || value == "") {
        Logger.log("Warning: Properties have not been set up or are empty");
        Logger.log("Plase run the setupProperties function and fill in all the properties");
    }

    return value;
}

var registration_spreadsheet_id = get_property("Class registration spreadsheet ID");
var registration_form_id        = get_property("Registration form ID");
var email_tests_form_id         = get_property("Email tests form ID");
var questions_spreadsheet_id    = get_property("Questions spreadsheet ID");
var certificate_template_id     = get_property("Certificate template ID");
var certificate_folder_id       = get_property("Certificate folder ID");

function setupProperties() {
    properties.setProperties({
        "Class registration spreadsheet ID": "",
        "Registration form ID": "",
        "Email tests form ID": "",
        "Questions spreadsheet ID": "",
        "Certificate template ID": "",
        "Certificate folder ID": "",
    }, true);
}

function setupRegistrationForm() {
    var registration_form = FormApp.openById(registration_form_id);
    ScriptApp.newTrigger("onRegister").forForm(registration_form).onFormSubmit().create();
}

function setupEmailTestsForm() {
    var email_tests_form = FormApp.openById(email_tests_form_id);
    ScriptApp.newTrigger("onEmailTests").forForm(email_tests_form).onFormSubmit().create();
}

function onRegister(event) {
    var form_items = event.response.getItemResponses();

    var form_info = form_items.reduce(function (info, item_response) {

        var item = item_response.getItem();
        var title = item.getTitle();

        if (title === "Class code") {
            var response = item_response.getResponse();
            info.class_code = response;
        }

        return info;

    }, {class_code: ""});

    var email = event.response.getRespondentEmail();

    var person = PersonLookup.lookupPerson("Email", email)

    var registration_spreadsheet = SpreadsheetApp.openById(registration_spreadsheet_id);
    var registration_sheet = registration_spreadsheet.getSheetByName(form_info.class_code);

    registration_sheet.appendRow([
        new Date(),
        email,
        (person != null && person != undefined) ? person['First Name'] : "Not Found",
        (person != null && person != undefined) ? person['Last Name'] : "Not Found",
        (person != null && person != undefined) ? person['Banner ID'] : "Not Found",

    ]);
}

function onEmailTests(event) {
    // Get class code from form
    // For each person:
    //   look up name, id
    //   Generate unique url
    //   Send email

    var form_items = event.response.getItemResponses();

    var form_info = form_items.reduce(function (info, item_response) {

        var item = item_response.getItem();
        var title = item.getTitle();

        if (title === "Class code") {
            var response = item_response.getResponse();
            info.class_code = response;
        }

        return info;

    }, {class_code: ""});

    Logger.log(JSON.stringify(form_info));

    var registration_spreadsheet = SpreadsheetApp.openById(registration_spreadsheet_id);
    var registration_sheet = registration_spreadsheet.getSheetByName(form_info.class_code);

    var student_rows = registration_sheet.getDataRange().getValues().slice(3);

    Logger.log(JSON.stringify(student_rows));

    student_rows.forEach(function (student, index) {

        if (student[5] == "") {

            var email = student[1];

            registration_sheet.getRange(4 + index, 6).setValue(new Date());

            var url = "https://script.google.com/a/students.rowan.edu/macros/s/AKfycbwa831Ouqu70OtgMsSLwX7Vmc8k3NPGHfTyKdJlpOEY/dev?class_code=" + form_info.class_code + "&id=" + index;

            GmailApp.sendEmail(
                email,
                "ECE Safety Test",
                "Take your safety test here: " + url
            );
        }
    });
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
            questions: values.map(function (row, index) {

                /*
                 *  {
                 *      text: The text of the question
                 *      answers: A list of answers to the question
                 *  }
                 */

                //Logger.log(row);

                return {
                    text: row[0],
                    id: index,
                    category: sheet.getName(),
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
                            id: index + 1,
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
            //question.category = category.name;
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

function submitTest(responses) {
    Logger.log("Submitted");

    Logger.log(JSON.stringify(responses));

    var id = parseInt(responses.id);
    var class_code = responses.class_code;
    var questions = responses.answers;

    var questions_spreadsheet = SpreadsheetApp.openById(questions_spreadsheet_id);

    var total_questions = 0;
    var correct_questions = 0;

    Logger.log(id);
    Logger.log(class_code);
    Logger.log(questions);

    questions.forEach(function (question) {
        var category = question.category;
        var id = question.id;
        var response = question.response;

        Logger.log(category);
        Logger.log(id);
        Logger.log(response);

        var questions_sheet = questions_spreadsheet.getSheetByName(category);

        var correct_response = questions_sheet.getRange(4 + id, 2).getValue();

        Logger.log(correct_response);

        question.correct_response = correct_response;

        var total_count_range = questions_sheet.getRange(4 + id, 8);
        var correct_count_range = questions_sheet.getRange(4 + id, 7);

        Logger.log(total_count_range);
        Logger.log(correct_count_range);

        total_questions += 1;
        total_count_range.setValue(total_count_range.getValue() + 1);

        if (response == correct_response) {
            Logger.log("Correct");
            correct_questions += 1;
            correct_count_range.setValue(correct_count_range.getValue() + 1);
            question.correct = true;
        } else {
            Logger.log("Not correct");
            question.correct = false;
        }
    });

    var response_json = JSON.stringify(responses);
    var score = correct_questions / total_questions;
    var passed = score >= 0.8;

    Logger.log(response_json);
    Logger.log(score);
    Logger.log(passed);

    var registration_spreadsheet = SpreadsheetApp.openById(registration_spreadsheet_id);
    var registration_sheet = registration_spreadsheet.getSheetByName(class_code);

    Logger.log(id);

    registration_sheet.getRange(id + 4, 8).setValue(new Date())
    registration_sheet.getRange(id + 4, 9).setValue(score)
    registration_sheet.getRange(id + 4, 10).setValue(passed)
    registration_sheet.getRange(id + 4, 11).setValue(response_json)

    var student_data = registration_sheet.getRange(id+4, 1, 1, 7).getValues()[0];

    Logger.log(JSON.stringify(student_data));

    var email = student_data[1];
    var first_name = student_data[2];
    var last_name = student_data[3];
    var banner_id = student_data[4];

    if (passed) {
        // Generate certificate and email it
        Logger.log("passed, generating certificate");
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

        Logger.log("replacing text");

        copyBody.replaceText('<<FirstName>>', first_name);
        copyBody.replaceText('<<LastName>>', last_name);
        copyBody.replaceText('<<BannerID>>', banner_id);
        copyBody.replaceText('<<Email>>', email);
        //copyBody.replaceText('<<Department>>', department);
        //copyBody.replaceText('<<ClassCode>>', ece_class);
        //copyBody.replaceText('<<Section>>', section);
        copyBody.replaceText('<<CompletionDate>>', date);
        copyBody.replaceText('<<CalculatedScore>>', score*100);

        Logger.log("saving cerificate");

        copyDoc.saveAndClose();

        Logger.log("generating pdf");
        var pdf = DriveApp.createFile(copyFile.getAs('application/pdf'));

        Logger.log("removing non-pdf");
        copyFile.setTrashed(true);

        var folder = DriveApp.getFolderById(certificate_folder_id);

        folder.addFile(pdf);

        var parents = pdf.getParents();

        while(parents.hasNext()) {
            var parent = parents.next();
            if(parent.getId() !== folder.getId()) {
                parent.removeFile(pdf);
            }
        }

        pdf.setName(banner_id + "_" + last_name + "_" + date);

        Logger.log("sending email");
        Logger.log("email: " + email);
        GmailApp.sendEmail(
            email,
            "ECE Safety Training Certificate",
            "Hello " + first_name + ",\n" +
            "\n" +
            "Attatched is your safety training certificate\n" +
            "\n" +
            "\n" +
            " - The ECE Depeartment",
            {attachments: [pdf]}
        );
    } else {
        Logger.log("failed, not generating certificate");
        Logger.log("email: " + email);
        GmailApp.sendEmail(
            email,
            "ECE Safety Test",
            "Hello " + first_name + ",\n" +
            "\n" +
            "We regret to inform you that you have failed your ECE safety test\n" +
            "You have achieved a score of " + score*100.0 + "%.\n" +
            "A score of 80% or above is considered passing.\n" +
            "\n" +
            " - The ECE Department"
        );
        Logger.log("sent email");
    }
}


function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

function doGet(event) {
    Logger.log(JSON.stringify(event.parameter));

    var id = event.parameter.id;
    var class_code = event.parameter.class_code;

    if (id == undefined || id == null || class_code == undefined || id == null) {
        return HtmlService.createHtmlOutput("<p>Invalid Link</p>")
    }

    var registration_spreadsheet = SpreadsheetApp.openById(registration_spreadsheet_id);
    var registration_sheet = registration_spreadsheet.getSheetByName(class_code);

    var row_number = parseInt(id) + 4;

    if (registration_sheet == undefined || registration_sheet == null || row_number == NaN || row_number == null || row_number == undefined) {
        return HtmlService.createHtmlOutput("<p>Invalid Link</p>")
    }

    var registration_range = registration_sheet.getRange(row_number, 1, 1, registration_sheet.getLastColumn());
    var registration_row = registration_range.getValues()[0];

    Logger.log(JSON.stringify(registration_row));

    var emailed = registration_row[5];
    var clicked_link = registration_row[6];

    if (emailed == "" || emailed == null || emailed == undefined) {
        return HtmlService.createHtmlOutput("<p>Invalid Link</p>")
    }

    if (clicked_link != "") {
        return HtmlService.createHtmlOutput("<p>This test has already been taken</p>"
            // + "<pre>" +
            //clicked_link + "\n" +
            //row_number + "\n" +
            //JSON.stringify(registration_row) +
            //"</pre>"
        );
    }

    registration_sheet.getRange(row_number, 7).setValue(new Date());

    var t = HtmlService.createTemplateFromFile('index.html');

    t.id = id;
    t.class_code = class_code;

    var e = t.evaluate();
    return e;
}

function getQuestions() {
    var questions_sheet = SpreadsheetApp.openById(questions_spreadsheet_id);
    var questions = parseQuestions(questions_sheet);
    var random_questions = randomizeQuestions(questions);

    random_questions.map(function (question) {
        question.answers.map(function (answer) {
            answer.correct = undefined;
        });
    });

    return random_questions;
}

function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename)
        .getContent();
}

function tests() {
    var questions_spreadsheet = SpreadsheetApp.openById(QUESTIONS_SPREADSHEET_ID);

    var questions = parseQuestions(questions_spreadsheet);
    Logger.log(JSON.stringify(questions, null, 2));

    var random_questions = randomizeQuestions(questions);
    Logger.log(JSON.stringify(random_questions, null, 2));

    generateTest("Testy Testing", random_questions);
}

