

var test_element = document.getElementById("test");
var questions_list_element = document.getElementById("questions");
var submit_button = document.getElementById("submit_button");

console.log(config_name);

function onQuestionsLoad(questions) {

    var questions_list = new QuestionList(questions);

    questions_list_element.appendChild(questions_list.element);

    submit_button.onclick = function(event) {
        var responses = {
            answers: questions_list.getAnswers(),
            id: id,
            class_code: class_code,
        };

        console.log(responses);
        test_element.classList += " d-none";
        google.script.run.submitTest(responses);
    }
}

google.script.run.withSuccessHandler(onQuestionsLoad).getQuestions(config_name);

