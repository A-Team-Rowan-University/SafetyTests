function Question(question) {
    var self = this;

    self.element = document.createElement("div");
    self.question = question;

    // Question title
    self.title_element= document.createElement("h5");
    self.title_element.textContent = self.question.text;
    self.title_element.classList += " mb-1 m-3";
    self.element.appendChild(self.title_element);
}
