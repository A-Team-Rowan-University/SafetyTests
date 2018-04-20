function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}

// Varibles used in functions
var questionNum;
var totalScore = 0;

var questionsME = [
    {Num: 1,
    Question:"...",
   Answer:"A"},
    {Num: 2,
    Question:"...",
   Answer:"A"},
    {Num: 3,
    Question:"...",
   Answer:"A"},
    {Num: 4,
    Question:"...",
   Answer:"A"},
    { Num: 5,
    Question:"...",
   Answer:"A"},
    { Num: 6,
    Question:"...",
   Answer:"A"},
    { Num: 7,
    Question:"...",
   Answer:"A"},  
    { Num: 8, 
    Question:"...",
   Answer:"A"},
    { Num: 9,
    Question:"...",
   Answer:"A"},
    { Num: 10,
    Question:"...",
   Answer:"A"},
    { Num: 11, 
    Question:"...",
   Answer:"A"},
    { Num: 12, 
    Question:"...",
   Answer:"A"}  
];
  
 

// Randomize
function shuffle(questionsME) {
  
  // Local Variables
  var temporaryValue = null;
  var randomIndex = null;
  var currentIndex = null;
  
  currentIndex = questionsME.length, temporaryValue, randomIndex;
  
  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// Randomize test
function testShuffle() {
  questionsME = questionsME.shuffle(array);
  console.log(questionsME);
}

// Record the user's response
function userResponse() {
  
   var x = document.forms["SafetyTest"]["fname"].value;
    if (x == "") {
        alert("Name must be filled out");
        return false;
    }

  
}

// Collect the total amount of correct answers
function gradeTestME() {
  
  var i;
  for (var i = 0; i < questionsME.length; i++) {
  if (Response = Answer){
    totalScore++;
    }
    if (q2 = a2){
    totalScore++;
    }
      if (q3 = a3){
    totalScore++;
    }
       if (q4 = a5){
    totalScore++;
    }  
         if (q6 = a7){
    totalScore++;
    } 
           if (q8 = a8){
    totalScore++;
    }
             if (q9 = a9){
    totalScore++;
    }
               if (q10 = a10){
    totalScore++;
    }
                 if (q11 = a11){
    totalScore++;
    }
                   if (q12 = a12){
    totalScore++;
    }
                   return totalScore;
  }
}
