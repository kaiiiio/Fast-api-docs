// Done - | 600

// getting common pair as output - Object.forEach, for - L-Learn
const input1 = { a: 1, b: 2, c: 3, d: 10, e: 12 };
const input2 = { a: 2, e: 12, f: 6, d: 10 };
let output = {};
Object.keys(input1).forEach((item) => {
  if (input2[item] === input1[item]) {
    output[item] = input1[item];     // imp
  }
});
console.log("output1", output); // { d: 10, e: 12 }

// const input1 = { a: 1, b: 2, c: 3, d: 10, e: 12 };
// const input2 = { a: 2, e: 12, f: 6, d: 10 };
function func(input1, input2) {
  let obj = {};
  for (let i in input1) {
    if (input1[i] == input2[i]) {
      obj[i] = input2[i];
    }
  }
  return obj;
}
console.log(func(input1, input2));

//////////////////////////////////////////////////////// L
// Certainly! Below is an example showcasing operations like insertion, addition, update, deletion, filtering, and searching in an array of objects:

// ```javascript
// Initial array of objects
let data = [
  { id: 1, name: 'Alice', age: 25 },
  { id: 2, name: 'Bob', age: 30 },
  { id: 3, name: 'Charlie', age: 28 },
];

// Insertion
const newItem = { id: 4, name: 'David', age: 22 };
data.push(newItem);

// Addition
const addNewItem = (item) => {
  data = [...data, item];
};

// Update
const updateItem = (id, updatedFields) => {
  data = data.map((item) => {
    if (item.id === id) {
      return { ...item, ...updatedFields };
    }
    return item;
  });
};
// OR


const index = data.findIndex(item => item.id === 2);

// If the index is found, update the age to 35
if (index !== -1) {
  data[index].age = 35;
}

/////////////////////////////////////
// Deletion
const deleteItem = (id) => {
  data = data.filter((item) => item.id !== id);
};

// Filtering
const filteredData = data.filter((item) => item.age > 25);

// Searching               L
const searchByName = (searchTerm) => {
  return data.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

// Usage
console.log('Original Data:', data);
addNewItem({ id: 5, name: 'Eva', age: 35 });
console.log('After Addition:', data);
updateItem(2, { age: 32 });
console.log('After Update:', data);
deleteItem(1);
console.log('After Deletion:', data);
console.log('Filtered Data:', filteredData);
console.log('Search Results:', searchByName('Ch'));


// This example demonstrates operations on an array of objects: inserting a new item, adding an item using a function, updating an item based on its ID, deleting an item based on its ID, filtering based on a condition, and searching by name using a search term. Adjust these functions according to the specific needs and structure of your objects and use cases.

// ------------------------------------------------------------------L
var inputString = "Good morning good afternoon good morning good night";

// Find the first occurrence of "good morning"
var firstOccurrence = inputString.indexOf("good morning");

if (firstOccurrence !== -1) {
  // Find the second occurrence starting from the position after the first occurrence
  var secondOccurrence = inputString.indexOf(
    "good morning",
    firstOccurrence + 1
  );

  if (secondOccurrence !== -1) {
    // Replace the second occurrence with "good bye"
    var modifiedString =
      inputString.slice(0, secondOccurrence) +
      "good bye" +
      inputString.slice(secondOccurrence + 12); // 12 is the length of "good morning"

    console.log(modifiedString);
  } else {
    console.log("Second occurrence not found.");
  }
} else {
  console.log("First occurrence not found.");
}

// ------------------------------------------------------------------ 
// second largest number - sort , Set ko sort , sort-position-for     L
// In JavaScript, data types can be categorized as primitive and non - primitive(also known as reference types).

// ** Primitive Data Types:**
//   - Primitive data types are immutable and stored directly in memory.
// - They include`number`, `string`, `boolean`, `null`, `undefined`, and`symbol`.
// - Operations on primitive types result in the creation of a new value rather than modifying the existing one.
// - Variables of primitive types store the actual value.

// ** Non - Primitive(Reference) Data Types:**
// - Non - primitive data types are mutable and stored by reference in memory.
// - They include`object`, `array`, `function`, and `Date`.
// - Operations on non - primitive types may modify the existing value since they are stored as references.
// - Variables of non - primitive types store references or addresses pointing to the actual data.

// In summary, primitive types are simple, immutable values, while non - primitive types are more complex, mutable objects that are stored by reference.Understanding these distinctions is crucial for effective JavaScript programming and memory management.

const input = [1, 4, 7, 2, 4, 7, 6, 6];
// const input = [1, 2, -2, 11, 7, 1]; 
input.sort((a, b) => b - a);
function secondLargest(input) {
  for (value of input) {
    let temp = input[0];
    if (value !== temp) {
      return value;
      break;
    }
  }
}
const result = secondLargest(input);
console.log(result); // 6

// sort  -  Bubble sort is a simple sorting algorithm with a time complexity of O(n^2), and it may not be the most efficient for large arrays. For better performance, other sorting algorithms like quicksort or mergesort are usually preferred.                L

function bubbleSort(arr) {
  const n = arr.length;

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      // Swap if the element found is greater than the next element
      if (arr[j] > arr[j + 1]) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}

// Example Usage
const numbers = [5, 2, 9, 1, 5, 6];
const sortedNumbers = bubbleSort(numbers);

console.log("Sorted Array:", sortedNumbers);

//---------------------------------
const input = [1, 2, -2, 11, 7, 1];
const input1 = [1, 4, 7, 2, 4, 7];
function secondLargest(input) {
  let arr = [...new Set(input)].sort((a, b) => a - b);
  return arr[arr.length - 2];
}
console.log(secondLargest(input)); //7
console.log(secondLargest(input1)); //4

const points = [40, 100, 1, 5, 25, 10];
points.sort(function (a, b) {
  return a - b;
});

//----------------------------- L
const input = [1, 2, -2, 11, 7, 1];
const input1 = [1, 4, 7, 2, 4, 7];
function secondLargest(input) {
  let arr = input.sort((a, b) => a - b);
  let res = arr[arr.length - 1];
  for (let i = arr.length - 2; i >= 0; i--) {
    if (res != input[i]) {
      res = input[i];
      break;
    }
  }
  return res;
}
// sort - nlog - complexity
console.log(secondLargest(input)); //7
console.log(secondLargest(input1)); //4

const output = [11, 4, -2, 2, 7];
// ----------------------------------------------------------------------
// rotating array by 2 places -

const input0 = [1, 2, -2, 11, 7, 1];
input0.sort((a, b) => b - a);

function secondLargest(input) {
  for (value of input) {
    let temp = input[0];
    if (value !== temp) {
      return value;
      break;
    }
  }
}

const result0 = secondLargest(input0);

console.log(result0); // 7
// ---------------------------------------------------------
// first missing odd number - start, end, ek khali array me i ko push kr dia - L

const input3 = [5, 7, 9, 11, 15, 17, 21, 25];
let inputFirst3 = input3[0];
let inputEnd3 = input3.at(-1);
let missDigit3 = [];
for (let i = inputFirst3; i <= inputEnd3; i++) {
  if (i % 2 !== 0 && !input3.includes(i)) {
    missDigit3.push(i);
  }
}
console.log(missDigit3); // [ 13, 19, 23 ]

//------- 

// const input = [5, 7, 9, 11, 15, 17];
for (let i = 0; i < input3.length; i++) {
  let current = input3[i];
  let next3 = current + 2;
  if (input3[i + 1] === next3) continue;
  else {
    console.log(next3); //13
    break;
  }
}


//   L
const input = [5, 7, 9, 11, 15, 17];
for (let i = 0; i < input.length; i++) {
  let current = input[i];
  let next = current + 2;
  if (input[i + 1] !== next) {
    console.log(next);
    break;
  }
}

// -------------------------------------------------------------------
//  Reverse word by word - L - split-map-split-reverse-join, map-split-reverse-join


let str = "This is JavaScript Code";
let result = str
  .split(" ")
  .map((el) => el.split("").reverse().join(""))
  .join(" ");
console.log("result: ", result); // sihT si tpircSavaJ edoC

// -----
str.split("").reverse().join("");
// ----  L
let result = "";
for (let i = 0; i < str.length; i++) {
  result = str[i] + result;
}
console.log(result); // edoc tpircsavaj si siht
////////////////////
let result1 = "";
for (let i = str.length - 1; i >= 0; i--) {
  result1 += str[i];
}
console.log(result1);
// -----------------------------------------------------------------
//  Find max occurring char - L  split-reduce-object.keys-includes

const str2 = "This is Javascript Code and you have to find max char";
const arrOfstr2 = str2.split("");
const arr2 = arrOfstr2.reduce(
  (acc, curr) =>
    Object.keys(acc).includes(curr)
      ? { ...acc, [curr.toLowerCase()]: acc[curr] + 1 }
      : { ...acc, [curr.toLowerCase()]: 1 },
  {}
);
const count2 = Object.entries(arr2).sort((a, b) => b[1] - a[1]);
console.log(count2); // all counts
console.log(count2[0]);


//////////////   exclude space count  + return** in reduce must for proper logic     L
const str2 = "This is Javascript Code and you have to find max char";
const arrOfstr2 = str2.split("");
const arr2 = arrOfstr2.reduce((acc, curr) => {
  if (curr !== " ") {
    return Object.keys(acc).includes(curr)
      ? { ...acc, [curr.toLowerCase()]: acc[curr.toLowerCase()] + 1 }
      : { ...acc, [curr.toLowerCase()]: 1 };
  }
  return acc;
}, {});

const count2 = Object.entries(arr2).sort((a, b) => b[1] - a[1]);
console.log(count2);

// ----------------------------------------------------------------------------

// Write a function that takes an array of integers and returns the sum of all the integers.  L

function sumArray(array) {
  let sum = 0;
  for (let i = 0; i < array.length; i++) {
    sum += array[i]; // ------ L
  }
  return sum;
}
console.log(sumArray([1, 2, 3])); // 6


////
// The issue with your code is that the `sumArray` function is not returning anything.In JavaScript, if a function does not explicitly return a value, it implicitly returns`undefined`.To fix this, you need to add a `return` statement before the `array.reduce` call.Here's the corrected code:

//   javascript
function sumArray(array) {
  return array.reduce((acc, i) => {
    return acc + i;
  }, 0);
}

console.log(sumArray([1, 2, 3]));


// Now, the`sumArray` function will correctly return the sum calculated using the `reduce` method, and you should see the expected output of `6` when you run the code.
// -----------------------------------------------------------------------------
// Write a function that takes an array of integers and returns the largest integer in the array.         L

let array = [1, 5, 2, 9, 3];

function maxArray(array) {
  let max = array[0];
  for (let i = 1; i < array.length; i++) {
    if (array[i] > max) {
      max = array[i];
    }
  }
  return max
}
console.log(maxArray(array));
// OR
maxArray = [1, 5, 2, 9, 3];
let arr = maxArray.sort((a, b) => a - b);
console.log(arr[arr.length - 1]);
// Example usage:
console.log(maxArray([1, 5, 2, 9, 3])); // 9
// -------------------------------------------------------------------------------
// Write a function that takes a string as input and returns the reverse of the string.       L
function reverseString(str) {
  let reversed = "";
  for (let i = str.length - 1; i >= 0; i--) {
    reversed += str[i];
  }
  return reversed;
}

// Example usage:
console.log(reverseString("hello"));
//OR -> for (let i = 0; i <= str.length - 1; i++) {
// reversed = str[i] + reversed;---------------------------------------------------------------------------------

// Write a function that takes an array of integers and returns a new array with only the even integers.  -> return empty arar, provided array.push(empty)
function filterEven(array) {
  let evenArray = [];
  for (let i = 0; i < array.length; i++) {
    if (array[i] % 2 === 0) {
      evenArray.push(array[i]);
    }
  }
  return evenArray;
}

// Example usage:
console.log(filterEven([1, 2, 3, 4, 5])); // Output: [2, 4]
// ----------------------------------------------------------------------------------
// Write a function that takes an array of integers and returns the second largest integer in the array.    L

function secondLargest(array) {
  let max = array[0];
  let secondMax = array[0];
  for (let i = 1; i < array.length; i++) {
    if (array[i] > max) {
      secondMax = max;
      max = array[i];
    } else if (array[i] > secondMax && array[i] !== max) { // you might end up considering the same value as both max and secondMax 
      secondMax = array[i];
    }
  }
  return secondMax;
}

// // Example usage:
console.log(secondLargest([1, 5, 2, 9, 3])); // Output: 5

// ------------------------------------------------------------------------------    L
// Write a function that takes a string and returns a new string with only the vowels in the original string.

function getVowels(str) {
  const vowels = "aeiouAEIOU";
  let vowelString = "";
  for (let i = 0; i < str.length; i++) {
    if (vowels.includes(str[i])) {
      vowelString += str[i];
    }
  }
  return vowelString;
}

// Example usage:
console.log(getVowels("Hello, World!")); // Output: "eoo"
// ------------------------------------------------------------------------------
// Write a function that takes an array of integers and returns the second smallest integer in the array.   L

// // Example usage:
// console.log(findSecondSmallest([1, 5, 2, 9, 3])); // Output: 2

function findSecondSmallest(arr) {
  let smallest = Infinity;
  let secondSmallest = Infinity;

  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < smallest) {
      secondSmallest = smallest;
      smallest = arr[i];
    } else if (arr[i] < secondSmallest && arr[i] !== smallest) {
      secondSmallest = arr[i];
    }
  }

  return secondSmallest;
  // console.log(secondSmallest);
}

// Example usage:
const arr = [5, 3, 1, 4, 2];
const secondSmallest = findSecondSmallest(arr); // Returns 2
// ---------------------------------------------------------------------------
// Write a function that takes a string and returns true if the string is a palindrome and false otherwise.
function isPalindrome(str) {
  const reversed = str.split("").reverse().join("");
  return str === reversed;                 //  L
}

// Example usage:
console.log(isPalindrome("racecar")); // Output: true
console.log(isPalindrome("hello")); // Output: false

// ------------------------------------------------------------------------------
// Write a function that takes a sorted array of integers and a target integer and returns the index of the target integer in the array. If the target integer is not in the array, return -1.    L

function binarySearch(array, target) {
  let left = 0;
  let right = array.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (array[mid] === target) {
      return mid;
    } else if (array[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return -1;
}

// Example usage:
console.log(binarySearch([1, 2, 3, 4, 5], 4)); // Output: 3
console.log(binarySearch([1, 2, 3, 4, 5], 6)); // Output: -1
// OR - indexOf, findIndex ---- L ---------------------------------------------------------------------------
// Write a function that takes a string and returns the first non-repeating character in the string. If there are no non-repeating characters, return null.    L

function firstNonRepeatingChar(str) {
  const charCounts = {};
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (charCounts[char]) {
      charCounts[char]++;
    } else {
      charCounts[char] = 1;
    }
  }
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (charCounts[char] === 1) {
      return char;
    }
  }
  return null;
}

// Example usage:
console.log(firstNonRepeatingChar("hello")); // Output: "h"
console.log(firstNonRepeatingChar("aabbc"));
//
//-------------------------------------------
// No of letter in String         L
function firstNonRepeatingChar(str) {
  const charCounts = {};
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (charCounts[char]) {
      charCounts[char]++;
    } else {
      charCounts[char] = 1;
    }
  }
  return charCounts;
}
console.log(firstNonRepeatingChar("hello i m alive")); // Output: "h" // {h: 1, e: 2, l: 3, o: 1, " ": 3, …}

//---------------------------------------------------------------------------------
function countCharacters(str) {
  const count = {};

  for (let char of str) {
    if (count[char]) {
      count[char]++;
    } else {
      count[char] = 1;
    }
  }

  return count;
}

const input = "aaaccdd";
const output = countCharacters(input);

console.log(output); // Output: {a: 3, c: 2, d: 2}
// ---------------------------------------------------------------------------------   L
// Problem: Write a function to find the factorial of a given positive integer in JavaScript.
function factorial(num) {
  if (num === 0 || num === 1) {
    return 1;
  } else {
    return num * factorial(num - 1);
  }
}

// Example usage:
const num = 5;
const result = factorial(num); // Returns 120
console.log(result);

// ---------------------------------------------------------------------------------
// Problem: Write a function to check whether a given string is a palindrome or not in JavaScript. --repeated

function isPalindrome(str) {
  const reversed = str.split("").reverse().join("");
  return str === reversed;
}

// Example usage:
const str = "racecar";
const result = isPalindrome(str); // Returns true
console.log(result);
// ---------------------------------------------------------------------------------
// Problem: Write a function to find the sum of two integers without using the + operator in JavaScript.
// function sum(a, b) {
//   while (b !== 0) {
//     const carry = a & b;
//     a = a ^ b;
//     b = carry << 1; // ##
//   }
//   return a;
// }

// // Example usage:
// const a = 10;
// const b = 20;
// const result = sum(a, b); // Returns 30
// console.log(result);
// -------------------------------------------------------------------------------
// Problem: Write a function to sort an array of integers using the quicksort algorithm in JavaScript...L

// function quicksort(arr) {
//   if (arr.length <= 1) {
//     return arr;
//   }

//   const pivot = arr[0];
//   const left = [];
//   const right = [];

//   for (let i = 1; i < arr.length; i++) {
//     if (arr[i] < pivot) {
//       left.push(arr[i]);
//     } else {
//       right.push(arr[i]);
//     }
//   }

//   return [...quicksort(left), pivot, ...quicksort(right)];
// }

// // Example usage:
// const arr = [5, 3, 1, 4, 2];
// const sorted = quicksort(arr); // Returns [1, 2, 3, 4, 5]
// console.log(sorted);
// ---------------------------------------------------------------------------------
// Write a function that takes in a string and returns the reverse of that string.----repeated   L
function reverseString(str) {
  let reversed = "";
  for (let i = str.length - 1; i >= 0; i--) {
    reversed += str[i];
  }
  return reversed;
}

console.log(reverseString("hello")); // "olleh"

// ---------------------------------------------------------------------------------
// Write a function that takes in an array of integers and returns the sum of all the even numbers in the array.
function sumOfEvenNumbers(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] % 2 === 0) {
      sum += arr[i];
    }
  }
  return sum;
}

console.log(sumOfEvenNumbers([1, 2, 3, 4, 5, 6])); // 12

// ---------------------------------------------------------------------------------
// Write a function that takes in an array of integers and returns the largest product of any two numbers in the array.     L

function largestProduct(arr) {
  let maxProduct = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      const product = arr[i] * arr[j];
      if (product > maxProduct) {
        maxProduct = product;
      }
    }
  }
  return maxProduct;
}

console.log(largestProduct([1, 2, 3, 4, 5])); // 20

// ---------------------------------------------------------------------------------    L
// Write a function that takes in an array of integers and returns the maximum sum of any contiguous subarray within the array.

function maximumSubarraySum(arr) {
  let maxSum = -Infinity;
  let currentSum = 0;
  for (let i = 0; i < arr.length; i++) {
    currentSum = Math.max(arr[i], currentSum + arr[i]);
    maxSum = Math.max(maxSum, currentSum);
  }
  return maxSum;
}

console.log(maximumSubarraySum([-2, 1, -3, 4, -1, 2, 1, -5, 4])); // 6

// ---------------------------------------------------------------------------------
// Write a function that takes in a string and checks if it is a palindrome (i.e. reads the same forwards and backwards).
function isPalindrome(str) {
  const reversed = str.split("").reverse().join("");
  return str === reversed;
}

console.log(isPalindrome("racecar")); // true

// ---------------------------------------------------------------------------------
//How do you sort an array of integers in ascending order in JavaScript?

const arr = [3, 1, 4, 2, 5];
arr.sort((a, b) => a - b); // [1, 2, 3, 4, 5]
// How do you sort an array of integers in descending order in JavaScript?

const arr = [3, 1, 4, 2, 5];
arr.sort((a, b) => b - a); // [5, 4, 3, 2, 1]
// ---------------------------------------------------------------------------------
// How do you sort an array of strings in alphabetical order in JavaScript?

const arr = ["banana", "apple", "pear", "orange"];
arr.sort(); // ["apple", "banana", "orange", "pear"]

// How do you sort an array of strings in reverse alphabetical order in JavaScript?

const arr = ["banana", "apple", "pear", "orange"];
arr.sort((a, b) => b.localeCompare(a)); // ["pear", "orange", "banana", "apple"]-------------------- L
// ---------------------------------------------------------------------------------
// How do you sort an array of objects by a specific property in JavaScript?----L

const arr = [
  { name: "John", age: 25 },
  { name: "Jane", age: 30 },
  { name: "Bob", age: 20 },
];

arr.sort((a, b) => a.age - b.age); // [{ name: "Bob", age: 20 }, { name: "John", age: 25 }, { name: "Jane", age: 30 }]
console.log(arr.sort());


// ---------------------------------------------------------------------------------
// code to reverse an array in js

const arr = [1, 2, 3, 4, 5];
arr.reverse(); // [5, 4, 3, 2, 1]
// The reverse() method mutates the original array by reversing the order of its elements. If you want to reverse a copy of the original array without modifying it, you can use the spread operator to create a new array:

const arr = [1, 2, 3, 4, 5];
const reversedArr = [...arr].reverse(); // [5, 4, 3, 2, 1]    L **
console.log(reversedArr);
console.log(arr.reverse());



/////   L
const arr = [1, 2, 3, 4, 5];

function reverseArray(array) {
  let start = 0;
  let end = array.length - 1;

  while (start < end) {
    // Swap elements at start and end positions
    const temp = array[start];
    array[start] = array[end];
    array[end] = temp;

    // Move towards the center of the array
    start++;
    end--;
  }
}

// Call the function to reverse the array
reverseArray(arr);

// Output the reversed array
console.log(arr); // Output: [5, 4, 3, 2, 1]

// ---------------------------------------------------------------------------------  L
// find duplicate elements in an array

// To find duplicate elements in an array, you can use a hash table or an object to keep track of the frequency of each element. Here's an example implementation in JavaScript:

function findDuplicates(arr3) {
  const freq = {};
  const duplicates = [];

  for (let i = 0; i < arr3.length; i++) {
    const elem = arr3[i];

    freq[elem] = freq[elem] ? freq[elem] + 1 : 1;

    if (freq[elem] === 2) {
      duplicates.push(elem);
    }
  }

  return duplicates;
}
// This function takes an array as its parameter and returns an array of all the duplicate elements in the input array. It works by iterating over the input array and keeping track of the frequency of each element using an object. If an element's frequency reaches 2, it is added to the duplicates array.

// Here's an example usage of the findDuplicates function:

const arr3 = [1, 2, 3, 2, 4, 5, 4];
const duplicates = findDuplicates(arr3);
console.log(duplicates); // [2, 4]
// Note that this implementation assumes that the input array only contains integers. If the array contains non-integer values or objects, you may need to modify the implementation accordingly.

// ---------------------------------------------------------------------------------   L

// find no of time an element occured in an array

// To find the number of times an element occurs in an array, you can use a similar approach to the previous question by using a hash table or an object to keep track of the frequency of each element. Here's an example implementation in JavaScript:

function countOccurrences(arr, elem) {
  let count = 0;

  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === elem) {
      count++;
    }
  }

  return count;
}
// This function takes an array and an element as its parameters and returns the number of times the element occurs in the array. It works by iterating over the input array and incrementing a count variable every time the element is found.

// Here's an example usage of the countOccurrences function:

// const arr = [1, 2, 3, 2, 4, 5, 4];
// const elem = 2;
// const count = countOccurrences(arr, elem);
// console.log(count); // 2
// Note that this implementation assumes that the input array only contains primitive values. If the array contains non-primitive values or objects, you may need to modify the implementation accordingly.

// To generate the Fibonacci series in JavaScript, you can use a loop to iterate through the desired number of terms and calculate each term based on the previous two terms. Here's an example implementation:    L

// function fibonacci(n) {
//   const series = [0, 1];

//   for (let i = 2; i < n; i++) {
//     const prev1 = series[i - 1];
//     const prev2 = series[i - 2];
//     series.push(prev1 + prev2);
//   }

//   return series;
// }
// This function takes a number n as its parameter and returns an array containing the first n terms of the Fibonacci series. The implementation uses an array series to store the series as it is generated, starting with the first two terms 0 and 1. It then uses a loop to generate the remaining terms by calculating each term as the sum of the previous two terms and appending it to the series array.

// Here's an example usage of the fibonacci function:

// const series = fibonacci(10);
// console.log(series); // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
// Note that this implementation has a time complexity of O(n), where n is the number of terms in the series.

// ---------------------------------------------------------------------------------  L

// In JavaScript, call, apply, and bind are three methods that can be used to control the execution context of a function. Here's an overview of each method:

// call
// The call method is used to invoke a function with a specified this value and arguments provided individually as arguments. Here's an example:

// javascript

function greet(name) {
  console.log(`Hello, ${name} !My name is ${this.name}.`);
}

const person = { name: "Alice" };

greet.call(person, "Bob");
// Output: Hello, Bob! My name is Alice.
// In this example, the call method is used to invoke the greet function with the person object as its execution context and the string 'Bob' as its argument.

// --------------------------------------------------------------------------------- L

// apply
// The apply method is similar to call, but it takes an array of arguments instead of individual arguments. Here's an example:

function add(a, b) {
  return a + b;
}

const numbers = [2, 3];

const sum = add.apply(null, numbers);
console.log(sum); // Output: 5
// In this example, the apply method is used to invoke the add function with null as its execution context and the array [2, 3] as its arguments.

// -------------------------------------------------------------------------
// bind
// The bind method is used to create a new function with a specified this value and partially applied arguments. Here's an example:

// javascript
// Copy code
function greet(name) {
  console.log(`Hello, ${name} !My name is ${this.name}.`);
}

const person = { name: "Alice" };

const greetAlice = greet.bind(person, "Alice");

greetAlice();
// // Output: Hello, Alice! My name is Alice.
// In this example, the bind method is used to create a new function greetAlice that has person as its execution context and the string 'Alice' as its first argument. When greetAlice is invoked, it logs the message 'Hello, Alice! My name is Alice.' to the console.

// Overall, these three methods provide flexibility in how you can execute a function and control its execution context in JavaScript.

// ---------------------------------------------------------------------------------
const myArr = [
  [1, 2],
  [3, 4],
  [5, 6],
];
const newArr = myArr.flat();
console.log(newArr);

// ---------------------------------------------------------------------------------
const fruits = ["Banana", "Orange", "Apple", "Mango"];
fruits.sort();
fruits.reverse();
console.log(fruits);
// ---------------------------------------------------------------------------------
const points = [40, 100, 1, 5, 25, 10];
points.sort(function (a, b) {
  return a - b;
});
console.log(points); //Ascending

const points = [40, 100, 1, 5, 25, 10];
points.sort(function (a, b) {
  return b - a;
});
console.log(points); // Descending
// ---------------------------------------------------------------------------------
const points = [40, 100, 1, 5, 25, 10];
points.sort(function (a, b) {
  return a - b;
});
// now points[0] contains the lowest value
// and points[points.length-1] contains the highest value

function myArrayMax(arr) {
  return Math.max.apply(null, arr);
}
console.log(myArrayMax);

// -------------------------------------------Example (Find Max) - This function loops through an array comparing each value with the highest value found:

function myArrayMax(arr) {
  let len = arr.length;
  let max = -Infinity;
  while (len--) {
    if (arr[len] > max) {
      max = arr[len];
    }
  }
  return max;
  //   console.log(max);
}
let arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
console.log(myArrayMax(arr));
// ------------------------------------This function loops through an array comparing each value with the lowest value found: Example (Find Min)           L
function myArrayMin(arr) {
  let len = arr.length;
  let min = Infinity;
  while (len--) {
    if (arr[len] < min) {
      min = arr[len];
    }
  }
  return min;
}
let arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
console.log(myArrayMin(arr));
// -------------------------------------forEach--not working         L
const numbers = [45, 4, 9, 16, 25];
let txt = "";
numbers.forEach(myFunction);
function myFunction(value) {
  txt += value + "<br>";
}
console.log(txt); //-----------------------  L

const array = [1, 2, 3, 4, 5];
array.forEach((element) => {
  console.log(element);
});

const array = [1, 2, 3, 4, 5]; // Modify each element of an array:
array.forEach((element, index, arr) => {
  arr[index] = element * 2;
});
console.log(array);

const obj = { a: 1, b: 2, c: 3 }; // Iterate over the properties of an object:
Object.keys(obj).forEach((key) => {
  console.log(key + ": " + obj[key]);
});

const str = "Hello, World!"; //  Iterate over the characters of a string:       L
Array.from(str).forEach((char) => {
  console.log(char);
});

const numbers = [1, -2, 3, -4, 5, -6]; // Find the sum of all positive numbers in an array:
let sum = 0;
numbers.forEach((number) => {
  if (number > 0) {
    sum += number;
  }
});
console.log(sum); // Output: 9

const nestedArray = [
  [1, 2],
  [3, 4],
  [5, 6],
]; // Flatten a nested array: // L
let flattenedArray = [];
nestedArray.forEach((innerArray) => {
  flattenedArray = flattenedArray.concat(innerArray);
});
console.log(flattenedArray); // Output: [1, 2, 3, 4, 5, 6]


//------
// Group objects in an array based on a property:                L 
const products = [
  { name: "Product A", category: "Category 1" },
  { name: "Product B", category: "Category 2" },
  { name: "Product C", category: "Category 1" },
  { name: "Product D", category: "Category 2" },
];
const groupedProducts = {};
products.forEach((product) => {
  const category = product.category;
  if (!groupedProducts[category]) {
    groupedProducts[category] = [];
  }
  groupedProducts[category].push(product);
});
console.log(groupedProducts);
/*
Output:
{
  'Category 1': [
    { name: 'Product A', category: 'Category 1' },
    { name: 'Product C', category: 'Category 1' }
  ],
  'Category 2': [
    { name: 'Product B', category: 'Category 2' },
    { name: 'Product D', category: 'Category 2' }
  ]
}
*/

// Find the first non-repeated character in a string:        L
function findFirstNonRepeatedCharacter(str) {
  const charCount = {};
  for (let char of str) {
    charCount[char] = charCount[char] + 1 || 1;
  }
  for (let char of str) {
    if (charCount[char] === 1) {
      return char;
    }
  }
  return null;
}
const input = "abacddbe";
const firstNonRepeated = findFirstNonRepeatedCharacter(input);
console.log(firstNonRepeated); // Output: "c"
//////////////////////////////////////////////////

// Remove duplicates from an array:         L
function removeDuplicates(array) {
  const uniqueArray = [];
  array.forEach((element) => {
    if (!uniqueArray.includes(element)) {
      uniqueArray.push(element);
    }
  });
  return uniqueArray;
}
const inputArray = [1, 2, 3, 2, 4, 1, 5];
const uniqueArray = removeDuplicates(inputArray);
console.log(uniqueArray); // Output: [1, 2, 3, 4, 5]

///////////////////////////////              L
// In React Router, `Routes` and `Switch` are two components used for handling routing and rendering components based on the URL.

// 1. ** `Routes`:**
//   - `Routes` is a component used to define the routing configuration within a `Router` component(like`BrowserRouter` or`MemoryRouter`).
//    - It renders the routes based on the defined paths and their corresponding components.
//    - `Routes` allows the nesting of routes and enables the rendering of multiple routes conditionally.
//    - Example:
// javascript
//      <Routes>
//        <Route path="/" element={<Home />} />
//        <Route path="/about" element={<About />} />
//        {/* Other routes */}
//      </Routes>
//      

// 2. ** `Switch`:**
//   - `Switch` is a component used to exclusively render the first `Route` or `Redirect` that matches the current URL.
//    - When a `Switch` component is used, only the first matching route will be rendered, even if multiple routes could potentially match.
//    - It is often used to ensure that only a single route is rendered at a time, especially when dealing with routes that share common prefixes.
//    - Example:
// javascript
//      <Switch>
//        <Route path="/login" element={<Login />} />
//        <Route path="/dashboard" element={<Dashboard />} />
//        <Route path="/profile" element={<Profile />} />
//        <Route path="/" element={<Home />} />
//      </Switch>
//      

// In essence, `Routes` is used to define the routing structure and configurations, while `Switch` is used to exclusively render the first matching route or redirect. `Routes` provides a way to structure and organize routes, whereas`Switch` ensures only one route is rendered at a time based on the URL.Both are essential components in handling routing logic within a React application.
////////////////////////////////////////////////////////
// It seems there might be a typo in your question.If you meant to compare "for" and "if" statements in JavaScript, here's the explanation:

// 1. ** "if" Statement:**
//   - The "if" statement is used for conditional execution of code based on a specified condition.
//    - If the condition evaluates to true, the code block inside the "if" statement is executed; otherwise, it is skipped.
//    - Example:

// ```javascript
//      let x = 10;

//      if (x > 5) {
//        console.log('x is greater than 5');
//      }
//      ```

// 2. ** "for" Statement:**
//   - The "for" statement is used for creating loops, allowing a block of code to be repeated multiple times.
//    - It typically consists of an initialization, a condition, and an iteration statement.
//    - Example:

// ```javascript
//      for (let i = 0; i < 5; i++) {
//        console.log(i);
//      }
//      ```

//    In this example, the code inside the loop will be executed five times, with the variable `i` ranging from 0 to 4.

// In summary, "if" statements are used for conditional execution, while "for" statements are used for creating loops with a specified initialization, condition, and iteration.Both are fundamental control flow structures in JavaScript, serving different purposes.
// ---------------------------------------Map
const numbers1 = [45, 4, 9, 16, 25];
const numbers2 = numbers1.map(myFunction);
function myFunction(value) {
  return value * 2;
}
console.log(numbers2);

// Double the values in an array:
const numbers = [1, 2, 3, 4, 5];
const doubledNumbers = numbers.map((number) => number * 2);
console.log(doubledNumbers); // Output: [2, 4, 6, 8, 10]

// Convert an array of strings to uppercase:
const names = ["John", "Jane", "Tom", "Emily"];
const upperCaseNames = names.map((name) => name.toUpperCase());
console.log(upperCaseNames); // Output: ["JOHN", "JANE", "TOM", "EMILY"]

// Extract specific properties from an array of objects:
const users = [
  { name: "John", age: 30 },
  { name: "Jane", age: 25 },
  { name: "Tom", age: 40 },
];
const names = users.map((user) => user.name);
console.log(names); // Output: ["John", "Jane", "Tom"]

// Compute the square root of each number in an array:
const numbers = [4, 9, 16, 25];
const squareRoots = numbers.map((number) => Math.sqrt(number));
console.log(squareRoots); // Output: [2, 3, 4, 5]

// Convert an array of temperatures from Celsius to Fahrenheit:
const celsiusTemperatures = [25, 30, 15, 10];
const fahrenheitTemperatures = celsiusTemperatures.map(
  (celsius) => (celsius * 9) / 5 + 32
);
console.log(fahrenheitTemperatures); // Output: [77, 86, 59, 50]

// Calculate the length of each word in a sentence:
const sentence = "Hello, how are you doing?";
const wordLengths = sentence.split(" ").map((word) => word.length);
console.log(wordLengths); // Output: [5, 3, 3, 4, 5]

// Generate a new array by adding an index to each element:
const names = ["John", "Jane", "Tom"];
const indexedNames = names.map((name, index) => `${index + 1}. ${name} `);
console.log(indexedNames); // Output: ["1. John", "2. Jane", "3. Tom"]

// Flatten an array of arrays:
const nestedArray = [
  [1, 2, 3],
  [4, 5],
  [6, 7, 8, 9],
];
const flattenedArray = nestedArray.map((subArray) => subArray.flat());
console.log(flattenedArray); // Output: [[1, 2, 3], [4, 5], [6, 7, 8, 9]]

// Filter and transform elements in an array:
const numbers = [1, 2, 3, 4, 5];
const transformedNumbers = numbers.map((number) => {
  if (number % 2 === 0) {
    return number * 2;
  } else {
    return number;
  }
});
console.log(transformedNumbers); // Output: [1, 4, 3, 8, 5]

// --------------------------------------flatMap()- first maps all elements of an array and then creates a new array by flattening the array.
const myArr = [1, 2, 3, 4, 5, 6];
const newArr = myArr.flatMap((x) => x * 2);
console.log(newArr);

// Flatten an array of arrays and remove duplicates:
const nestedArray = [
  [1, 2, 3],
  [2, 3, 4],
  [3, 4, 5],
];
const flattenedAndUnique = nestedArray
  .flatMap((subArray) => subArray)
  .filter((value, index, arr) => arr.indexOf(value) === index);
console.log(flattenedAndUnique); // Output: [1, 2, 3, 4, 5]

// Transform an array of objects and return a flattened result:----   L
const students = [
  { name: "John", subjects: ["Math", "Science"] },
  { name: "Jane", subjects: ["English", "History"] },
  { name: "Tom", subjects: ["Math", "Geography"] },
];
const subjects = students.flatMap((student) =>
  student.subjects.map((subject) => `${student.name} studies ${subject} `)
);
console.log(subjects);
/*
Output:
[
  "John studies Math",
  "John studies Science",
  "Jane studies English",
  "Jane studies History",
  "Tom studies Math",
  "Tom studies Geography"
]
*/

// Split a string into words, remove duplicates, and transform into an object:     LL
const sentence = "I love programming programming programming";
const wordCount = sentence
  .split(" ")
  .flatMap((word) => word.toLowerCase())
  .reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});
console.log(wordCount); // Output: { "i": 1, "love": 1, "programming": 3 }

// Generate combinations of elements from two arrays:
const fruits = ["apple", "banana"];
const colors = ["red", "yellow", "green"];
const combinations = fruits.flatMap((fruit) =>
  colors.map((color) => `${color} ${fruit} `)
);
console.log(combinations);
/*
Output:
[
  "red apple",
  "yellow apple",
  "green apple",
  "red banana",
  "yellow banana",
  "green banana"
]
*/

// ------------------------------------Filter-function myFunction(value, index, array)
const numbers = [45, 4, 9, 16, 25];
const over18 = numbers.filter(myFunction);
function myFunction(value) {
  return value > 18;
}
console.log(over18);

// Filter an array of objects based on multiple criteria:
const products = [
  { name: "Apple", category: "Fruit", price: 1.5 },
  { name: "Carrot", category: "Vegetable", price: 0.8 },
  { name: "Orange", category: "Fruit", price: 2.2 },
  { name: "Broccoli", category: "Vegetable", price: 1.0 },
  { name: "Banana", category: "Fruit", price: 0.5 },
];
const filteredProducts = products.filter((product) => {
  return product.category === "Fruit" && product.price < 2.0;
});
console.log(filteredProducts);
/*
Output:
[
  { name: 'Apple', category: 'Fruit', price: 1.5 },
  { name: 'Banana', category: 'Fruit', price: 0.5 }
]
*/

// Filter an array of numbers to get prime numbers:       
const numbers = [2, 3, 4, 5, 6, 7, 8, 9, 10];
function isPrime(num) {
  if (num < 2) {
    return false;
  }
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) {
      return false;
    }
  }
  return true;
}
const primeNumbers = numbers.filter((num) => isPrime(num));
console.log(primeNumbers); // Output: [2, 3, 5, 7]

/////////////
const numbers = [2, 3, 4, 5, 6, 7, 8, 9, 10];

const primeNumbers = numbers.filter((num) => {
  if (num < 2) return false;
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
  }
  return true;
});

console.log(primeNumbers);


//////////////////////////////////////////////////////////

// Filter an array of strings to find palindromic words:
const words = ["level", "apple", "radar", "banana", "deed"];
function isPalindrome(word) {
  return word === word.split("").reverse().join("");
}
const palindromes = words.filter((word) => isPalindrome(word));
console.log(palindromes); // Output: ["level", "radar", "deed"]

// Filter an array of objects to get the maximum value of a specific property:
const students = [
  { name: "John", score: 80 },
  { name: "Jane", score: 90 },
  { name: "Tom", score: 75 },
  { name: "Emily", score: 95 },
];
const maxScore = students.reduce(
  (max, student) => Math.max(max, student.score),
  0
);
const topStudents = students.filter((student) => student.score === maxScore);
console.log(topStudents); // Output: [{ name: 'Emily', score: 95 }]

// ----------------------------------------------Reduce
const numbers = [45, 4, 9, 16, 25];
let sum = numbers.reduce(myFunction);
function myFunction(total, value, index, array) {
  return total + value;
}
console.log(sum);

const numbers = [45, 4, 9, 16, 25];
let sum = numbers.reduce(myFunction, 100); //The reduce() method can accept an initial value:
function myFunction(total, value) {
  return total + value;
}
console.log(sum);

// Calculate the total sum of values in an array:
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce(
  (accumulator, currentValue) => accumulator + currentValue,
  0
);
console.log(sum); // Output: 15

// Find the average of values in an array:
const numbers = [10, 20, 30, 40, 50];
const average = numbers.reduce((accumulator, currentValue, index, array) => {
  accumulator += currentValue;
  if (index === array.length - 1) {
    return accumulator / array.length;
  } else {
    return accumulator;
  }
}, 0);
console.log(average); // Output: 30

// Group objects in an array based on a property:
const products = [
  { name: "Apple", category: "Fruit" },
  { name: "Carrot", category: "Vegetable" },
  { name: "Orange", category: "Fruit" },
  { name: "Broccoli", category: "Vegetable" },
  { name: "Banana", category: "Fruit" },
];
const groupedProducts = products.reduce((accumulator, currentValue) => {
  const category = currentValue.category;
  if (!accumulator[category]) {
    accumulator[category] = [];
  }
  accumulator[category].push(currentValue);
  return accumulator;
}, {});
console.log(groupedProducts);
/*
Output:
{
  Fruit: [
    { name: 'Apple', category: 'Fruit' },
    { name: 'Orange', category: 'Fruit' },
    { name: 'Banana', category: 'Fruit' }
  ],
  Vegetable: [
    { name: 'Carrot', category: 'Vegetable' },
    { name: 'Broccoli', category: 'Vegetable' }
  ]
}
*/

// Find the most frequent element in an array:       L
const numbers = [1, 2, 3, 4, 2, 3, 2, 1, 4, 2, 4, 4];
const frequencyMap = numbers.reduce((map, currentValue) => {
  map[currentValue] = (map[currentValue] || 0) + 1;
  return map;
}, {});
const mostFrequentElement = Object.entries(frequencyMap).reduce(
  (max, [key, value]) => {
    return value > max.value ? { key, value } : max;
  },
  { key: null, value: 0 }
);
console.log(mostFrequentElement); // Output: { key: '4', value: 5 }

// ------- reduceRight() works from right-to-left in the array      L
const numbers = [45, 4, 9, 16, 25];
let sum = numbers.reduceRight(myFunction);

function myFunction(total, value, index, array) {
  return total + value;
}
console.log(sum);
// ---------------------------------------------------------------------------------
const numbers = [45, 4, 9, 16, 25];
let allOver18 = numbers.every(myFunction);

function myFunction(value, index, array) {
  return value > 18;
}
console.log(allOver18); //false
// ---------------------------------------------Some
const numbers = [45, 4, 9, 16, 25];
let someOver18 = numbers.some(myFunction);
function myFunction(value, index, array) {
  return value > 18;
}
console.log(someOver18);

// Check if any element in an array satisfies a condition:
const numbers = [1, 2, 3, 4, 5];
const hasEvenNumber = numbers.some((number) => number % 2 === 0);
console.log(hasEvenNumber); // Output: true

// Validate if any string in an array meets a specific criteria:
const names = ["Alice", "Bob", "Charlie", "Dave"];
const hasLongName = names.some((name) => name.length > 5);
console.log(hasLongName); // Output: true

// Determine if at least one object in an array has a specific property:    LL
const people = [
  { name: "Alice", age: 25 },
  { name: "Bob", age: 30 },
  { name: "Charlie", city: "New York" },
  { name: "Dave", age: 40 },
];
const hasCityProperty = people.some((person) => "city" in person);
console.log(hasCityProperty); // Output: true

// Determine if at least one object in an array has a specific property:
const people = [
  { name: "Alice", age: 25 },
  { name: "Bob", age: 30 },
  { name: "Charlie", city: "New York" },
  { name: "Dave", age: 40 },
];
const hasCityProperty = people.some((person) => "city" in person);
console.log(hasCityProperty); // Output: true

// Check if any value in an array matches a pattern using a regular expression:
const emails = [
  "alice@example.com",
  "bob@example.com",
  "charlie",
  "dave@example.com",
];
const hasValidEmail = emails.some((email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
);
console.log(hasValidEmail); // Output: true

// ---------------------------------------indexOf()-Array.indexOf() returns -1 if the item is not found.

const fruits = ["Apple", "Orange", "Apple", "Mango"];
let position = fruits.indexOf("Apple") + 1;
console.log(position);

// Find the index of the last occurrence of an element in an array:
const numbers = [1, 2, 3, 2, 4, 2, 5];
const lastIndexOfTwo = numbers.lastIndexOf(2);
console.log(lastIndexOfTwo); // Output: 5



// Find the index of an object in an array based on a specific property:       L
const students = [
  { name: "Alice", id: 1 },
  { name: "Bob", id: 2 },
  { name: "Charlie", id: 3 },
  { name: "Dave", id: 4 },
];
const index = students.findIndex((student) => student.id === 3);
console.log(index); // Output: 2



// Search for multiple occurrences of a value in an array and return an array of indices: L
const numbers = [1, 2, 3, 2, 4, 2, 5];
function getAllIndices(arr, value) {
  const indices = [];
  let index = arr.indexOf(value);
  while (index !== -1) {
    indices.push(index);
    index = arr.indexOf(value, index + 1);
  }
  return indices;
}
const indicesOfTwo = getAllIndices(numbers, 2);
console.log(indicesOfTwo); // Output: [1, 3, 5]


///// L

const numbers = [1, 2, 3, 2, 4, 2, 5];
const valueToRemove = 2;

const filteredArray = numbers.filter((number) => number !== valueToRemove);

console.log(filteredArray); // Output: [1, 3, 4, 5]

////////// L
const numbers = [1, 2, 3, 2, 4, 2, 5];
const valueToRemove = 2;

for (let i = numbers.length - 1; i >= 0; i--) {
  if (numbers[i] === valueToRemove) {
    numbers.splice(i, 1);
  }
}

console.log(numbers); // Output: [1, 3, 4, 5]


// -----------------------------------lastIndexOf() - Array.lastIndexOf()        L
const fruits = ["Apple", "Orange", "Apple", "Mango"];
let position = fruits.lastIndexOf("Apple") + 1; //
console.log(position);

// Find the index of the last occurrence of an element in an array:
const numbers = [1, 2, 3, 2, 4, 2, 5];
const lastIndexOfTwo = numbers.lastIndexOf(2);
console.log(lastIndexOfTwo); // Output: 5

// Search for the last occurrence of a substring in a string and return the starting index:
const sentence = "The quick brown fox jumps over the lazy dog";
const lastIndexOfFox = sentence.lastIndexOf("fox");
console.log(lastIndexOfFox); // Output: 16

// Find the index of the last occurrence of an object in an array based on a specific property:
const students = [
  { name: "Alice", id: 1 },
  { name: "Bob", id: 2 },
  { name: "Charlie", id: 2 },
  { name: "Dave", id: 3 },
];
const lastIndex = students.map((student) => student.id).lastIndexOf(2);
console.log(lastIndex); // Output: 2

// Search for multiple occurrences of a value in an array and return the index of the last occurrence: L
const numbers = [1, 2, 3, 2, 4, 2, 5];
function getLastIndex(arr, value) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] === value) {
      return i;
    }
  }
  return -1;
}
const lastIndexTwo = getLastIndex(numbers, 2);
console.log(lastIndexTwo); // Output: 5

// -------------------------------------------- find()
const numbers = [4, 9, 16, 25, 29];
let first = numbers.find(myFunction);
function myFunction(value, index, array) {
  return value > 18;
}
console.log(first);

// Find the first element in an array that satisfies a specific condition:
const numbers = [10, 20, 30, 40, 50];
const firstNumberGreaterThan25 = numbers.find((number) => number > 25);
console.log(firstNumberGreaterThan25); // Output: 30

// Search for an object in an array based on a specific property:
const students = [
  { name: "Alice", id: 1 },
  { name: "Bob", id: 2 },
  { name: "Charlie", id: 3 },
  { name: "Dave", id: 4 },
];
const studentWithId3 = students.find((student) => student.id === 3);
console.log(studentWithId3); // Output: { name: 'Charlie', id: 3 }

// Find the first occurrence of a substring in a string:
const sentence = "The quick brown fox jumps over the lazy dog";
const firstWordWithThreeLetters = sentence
  .split(" ")
  .find((word) => word.length === 3);
console.log(firstWordWithThreeLetters); // Output: "The"



// Search for an element in a two-dimensional array:
const matrix = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];
const numberToFind = 5;
const foundElement = matrix.find((row) => row.includes(numberToFind));
console.log(foundElement); // Output: [4, 5, 6]

// -------------------------------Array findIndex()
const numbers = [4, 9, 16, 25, 29];
let first = numbers.findIndex(myFunction);
function myFunction(value, index, array) {
  return value > 18;
}
console.log(first);

// Find the index of the first element in an array that satisfies a specific condition:
const numbers = [10, 20, 30, 40, 50];
const firstIndexGreaterThan25 = numbers.findIndex((number) => number > 25);
console.log(firstIndexGreaterThan25); // Output: 2

// Search for the index of an object in an array based on a specific property:
const students = [
  { name: "Alice", id: 1 },
  { name: "Bob", id: 2 },
  { name: "Charlie", id: 3 },
  { name: "Dave", id: 4 },
];
const index = students.findIndex((student) => student.id === 3);
console.log(index); // Output: 2

// Find the index of the first occurrence of a substring in a string:
const sentence = "The quick brown fox jumps over the lazy dog";
const firstIndexWithThreeLetters = sentence
  .split(" ")
  .findIndex((word) => word.length === 3);
console.log(firstIndexWithThreeLetters); // Output: 0

// Search for an element in a two-dimensional array and return its index:
const matrix = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];
const numberToFind = 5;
const foundRowIndex = matrix.findIndex((row) => row.includes(numberToFind));
const foundColumnIndex = matrix[foundRowIndex].indexOf(numberToFind);
console.log(foundRowIndex, foundColumnIndex); // Output: 1 1

// ----------------------------------Array.from()
console.log(Array.from("ABCDEFG")); // [  'A', 'B', 'C', 'D', 'E', F',  'G' ]

// Create an array of numbers within a given range:
const range = (start, end) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);
const numbers = range(1, 10);
console.log(numbers); // Output: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// Convert a string into an array of characters:
const str = "Hello, World!";
const chars = Array.from(str);
console.log(chars); // Output: ['H', 'e', 'l', 'l', 'o', ',', ' ', 'W', 'o', 'r', 'l', 'd', '!']

// Create an array of objects with a specific property:     L
const names = ["Alice", "Bob", "Charlie"];
const people = Array.from(names, (name) => ({ name }));
console.log(people); // Output: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }]

// Generate an array of random numbers:
const randomNumbers = Array.from({ length: 5 }, () => Math.random());
console.log(randomNumbers); // Output: [0.123, 0.456, 0.789, 0.234, 0.567]

// ------------------------------ Array entries()
// Iterate over the entries of an array and print the index-value pairs: L
const fruits = ["apple", "banana", "cherry"];
for (const [index, value] of fruits.entries()) {
  console.log(`Index: ${index}, Value: ${value} `);
}
// Output:
// Index: 0, Value: apple
// Index: 1, Value: banana
// Index: 2, Value: cherry

// Convert an array into an array of objects with index-value pairs:      L
const fruits = ["apple", "banana", "cherry"];
const entries = Array.from(fruits.entries()).map(([index, value]) => ({
  index,
  value,
}));
console.log(entries);
// Output: [{ index: 0, value: 'apple' }, { index: 1, value: 'banana' }, { index: 2, value: 'cherry' }]

// Find the first index-value pair that matches a specific condition: //   L
const numbers = [10, 20, 30, 40, 50];
const entriesArray = [...numbers.entries()]; // Convert the iterator to an array**** L ---- else Object [Array Iterator] {} is returned
const result = entriesArray.find(([index, value]) => value > 30);

if (result) {
  const [index, value] = result;
  console.log(`Index: ${index}, Value: ${value} `);
} else {
  console.log("No matching condition found.");
}

// Convert an object into an array of key-value pairs:
const person = {
  name: "Alice",
  age: 30,
  city: "New York",
};
const entries = Object.entries(person);
console.log(entries);
// Output: [['name', 'Alice'], ['age', 30], ['city', 'New York']]

// ---------------------------------Array includes()
const fruits = ["Banana", "Orange", "Apple", "Mango"];
fruits.includes("Mango");
console.log(fruits);

// Check if an array contains any of the given values:
const numbers = [10, 20, 30, 40, 50];
const includesValue = numbers.includes(30);
console.log(includesValue); // Output: true

// Check if an array contains all values from another array:
const numbers = [10, 20, 30, 40, 50];
const checkValues = [20, 30, 40];
const includesAllValues = checkValues.every((value) => numbers.includes(value));
console.log(includesAllValues); // Output: true

// Check if an array contains a specific object based on a property value:
const persons = [
  { name: "Alice", age: 25 },
  { name: "Bob", age: 30 },
  { name: "Charlie", age: 35 },
];
const includesObject = persons.some((person) => person.name === "Bob");
console.log(includesObject); // Output: true

// Check if an array contains a substring in any of its string elements:
const strings = ["Hello, World!", "Goodbye", "Welcome"];
const includesSubstring = strings.some((str) => str.includes("World"));
console.log(includesSubstring); // Output: true

// ------------------------------Array Spread (...)          L
const q1 = ["Jan", "Feb", "Mar"];
const q2 = ["Apr", "May", "Jun"];
const q3 = ["Jul", "Aug", "Sep"];
const q4 = ["Oct", "Nov", "May"];
const year = [...q1, ...q2, ...q3, ...q4];
console.log(year);

// Merge multiple arrays into a single array:
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const arr3 = [7, 8, 9];
const mergedArray = [...arr1, ...arr2, ...arr3];
console.log(mergedArray); // Output: [1, 2, 3, 4, 5, 6, 7, 8, 9]

// Clone an array and modify its contents:      L
const originalArray = [1, 2, 3];
const modifiedArray = [...originalArray, 4, 5, 6];
console.log(modifiedArray); // Output: [1, 2, 3, 4, 5, 6]

// Convert an array-like object into a real array: // error
const arrayLikeObject = { 0: "Hello", 1: "World", length: 2 };
const realArray = [...arrayLikeObject]; // arrayLikeObject is not iterable - error
console.log(realArray); // Output: ['Hello', 'World']

// Use the spread operator with Math.max() to find the maximum value in an array:   L
const numbers = [10, 5, 8, 12, 3];
const maxNumber = Math.max(...numbers);
console.log(maxNumber); // Output: 12

// ---------------------------------------------------------------------------------
const cars = ["Volvo", "BMW"]; // Allowed
{
  const cars = ["Volvo", "BMW"]; // Allowed
}
{
  const cars = ["Volvo", "BMW"]; // Allowed
}
const d = new Date();
const d = new Date();
console.log(d.toString());
// ---------------------------------------------------------------------------------
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const d = new Date("2021-03-25");
let day = days[d.getDay()];
console.log(day);

// ---------------------------------------------------------------------------------
// Math.E        // returns Euler's number
console.log(Math.PI); // Output: 3.141592653589793

// Math.PI       // returns PI
console.log(Math.PI); // Output: 3.141592653589793

// Math.SQRT2    // returns the square root of 2
console.log(Math.sqrt(16)); // Output: 4

// Math.SQRT1_2  // returns the square root of 1/2
// Math.LN2      // returns the natural logarithm of 2
// Math.LN10     // returns the natural logarithm of 10
// Math.LOG2E    // returns base 2 logarithm of E
// Math.LOG10E   // returns base 10 logarithm of E
// Math.pow()
// console.log(Math.pow(2, 3)); // Output: 8 (2 raised to the power of 3)

// Math.abs()
console.log(Math.abs(-5)); // Output: 5

// Math.floor()
console.log(Math.floor(3.9)); // Output: 3

// Math.ceil()
console.log(Math.ceil(3.1)); // Output: 4

// Math.random()
console.log(Math.random()); // Output: a random number between 0 and 1

// Number to Integer :
// Math.round(x)	Returns x rounded to its nearest integer
// Math.ceil(x)	Returns x rounded up to its nearest integer
// Math.floor(x)	Returns x rounded down to its nearest integer
// Math.trunc(x)	Returns the integer part of x (new in ES6)
// ---------------------------------------------------------------------------------
// let x = Math.max(0, 150, 30, 20, -8, -200);
// let x = Math.min(0, 150, 30, 20, -8, -200);
// console.log(x)
// Math.random();
// Math.log();

// Math.floor(Math.random() * 10); // Math.random() used with Math.floor() can be used to return random integers.

// ---------------------------------------------------------------------------------
// Boolean false
// 0,-0,"",x(undefined ho),null, false, NaN
// ---------------------------------------------------------------------------------
//The Nullish Coalescing Operator (??)-   ?? operator returns the first argument if it is not nullish (null or undefined)
// ------------------------------------------------------Conditional
// Use if to specify a block of code to be executed, if a specified condition is true
// Use else to specify a block of code to be executed, if the same condition is false
// Use else if to specify a new condition to test, if the first condition is false
// Use switch to specify many alternative blocks of code to be executed

// Nested conditionals with multiple conditions:
const num = 10;
if (num > 0) {
  if (num % 2 === 0) {
    console.log("Positive even number");
  } else {
    console.log("Positive odd number");
  }
} else if (num < 0) {
  console.log("Negative number");
} else {
  console.log("Zero");
}

// Using ternary operator for complex conditions:
const age = 25;
const hasLicense = true;
const result = age >= 18 && hasLicense ? "Can drive" : "Cannot drive";
console.log(result);
// Switch statement with multiple cases and fall-through behavior:     L
const day = "Sunday";
switch (day) {
  case "Monday":
  case "Tuesday":
    console.log("Weekday");
    break;
  case "Wednesday":
  case "Thursday":
    console.log("Midweek");
    break;
  case "Friday":
    console.log("TGIF");
    break;
  case "Saturday":
  case "Sunday":
    console.log("Weekend");
    break;
  default:
    console.log("Invalid day");
}

// Chaining ternary operators for complex conditions:
const number = 10;
const result = number > 0 ? "Positive" : number < 0 ? "Negative" : "Zero";
console.log(result);

// ----------------------------------------Switch & switch-break           L
// Simple switch statement:
const day = 3;
let dayName;

switch (day) {
  case 1:
    dayName = "Monday";
    break;
  case 2:
    dayName = "Tuesday";
    break;
  case 3:
    dayName = "Wednesday";
    break;
  case 4:
    dayName = "Thursday";
    break;
  case 5:
    dayName = "Friday";
    break;
  case 6:
    dayName = "Saturday";
    break;
  case 7:
    dayName = "Sunday";
    break;
  default:
    dayName = "Invalid day";
}
console.log(dayName); // Output: Wednesday

// Fall-through behavior in switch statement:
const grade = "B+";
let message;

switch (grade) {
  case "A+":
  case "A":
    message = "Excellent";
    break;
  case "B+":
  case "B":
    message = "Good";
    break;
  case "C":
    message = "Average";
    break;
  default:
    message = "Need to improve";
}
console.log(message); // Output: Good

// Using switch statement with ranges:        L
const score = 85;
let grade;

switch (true) {
  case score >= 90:
    grade = "A";
    break;
  case score >= 80:
    grade = "B";
    break;
  case score >= 70:
    grade = "C";
    break;
  case score >= 60:
    grade = "D";
    break;
  default:
    grade = "F";
}
console.log(grade); // Output: B

// ----------------------------------- Loop - and break inside loop -------------
// --------------- for - loops through a block of code a number of times

// Basic "for" loop to iterate over an array:
const numbers = [1, 2, 3, 4, 5];
for (let i = 0; i < numbers.length; i++) {
  console.log(numbers[i]);
}

// "for" loop with a step value to iterate in increments:
for (let i = 0; i <= 10; i += 2) {
  console.log(i);
}

// "for" loop to iterate over the characters of a string:
const message = "Hello, World!";
for (let i = 0; i < message.length; i++) {
  console.log(message[i]);
}

// "for" loop with a nested loop to iterate over a two-dimensional array:    L
const matrix = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];
for (let i = 0; i < matrix.length; i++) {
  for (let j = 0; j < matrix[i].length; j++) {
    console.log(matrix[i][j]);
  }
}

// "for" loop with the "break" statement to exit the loop early:
const numbers = [1, 2, 3, 4, 5];
for (let i = 0; i < numbers.length; i++) {
  if (numbers[i] === 3) {
    console.log("Found the number 3!");
    break;
  }
}

// Find the first prime number in a range:     L 
const start = 10;
const end = 20;
let firstPrime;
for (let i = start; i <= end; i++) {
  let isPrime = true;
  for (let j = 2; j < i; j++) {
    if (i % j === 0) {
      isPrime = false;
      break;
    }
  }
  if (isPrime) {
    firstPrime = i;
    break;
  }
  // if (isPrime) {
  //   console.log(i) //all primes    L
  // }
}
console.log(firstPrime); // Output: 11
////////////////////////////////         L
let count = 0
let i, j
for (j = 2; j <= 100; j++) {
  for (i = 1; i <= j; i++) {
    if (j % i == 0)
      count++
  }

  if (count == 2) // After the inner loop, if the count is equal to 2, it means the number has only two factors (1 and itself), indicating that it is a prime number.The prime number is then logged to the console using console.log(j). The count is reset to 0 for the next iteration.
    console.log(j)
  count = 0
}
//////////////////////////////////////////////////////

// Search for a specific pattern in a string:       L 
const text = "Lorem ipsum dolor sit amet";
const pattern = "dolor";
let isFound = false;
for (let i = 0; i < text.length; i++) {
  if (text.slice(i, i + pattern.length) === pattern) {
    isFound = true;
    break;
  }
}
console.log(isFound); // Output: true


// Find the first missing positive number in an array:   L
const numbers = [1, 2, 0, 4, 5];
let firstMissing = 1;
for (let i = 0; i < numbers.length; i++) {
  if (numbers[i] === firstMissing) {
    firstMissing++;
  } else {  // The console.log(firstMissing) statement outside the loop then prints the current value of firstMissing, which is 1 (because it wasn't incremented inside the loop), hence resulting in the output of 1, not 3.
    break;
  }
}
console.log(firstMissing); // Output: 3

// --------------- for/in - loops through the properties of an object
// Iterate over the properties of an object:
const person = {
  name: "John",
  age: 30,
  city: "New York",
};
for (let key in person) {
  console.log(key + ": " + person[key]);
}

// Iterate over the indices of an array-like object:
const str = "Hello";
const arrayLike = {
  0: "H",
  1: "e",
  2: "l",
  3: "l",
  4: "o",
  length: 5,
};
for (let index in arrayLike) {
  console.log(str[index]);
}

// Skip inherited properties using hasOwnProperty():
const student = {
  name: "John",
  age: 20,
};
student.__proto__.grade = "A";
for (let key in student) {
  if (student.hasOwnProperty(key)) {
    console.log(key + ": " + student[key]);
  }
}

// Iterate over an iterable object:
const set = new Set([1, 2, 3]);
for (let value in set) {
  console.log(value);
}

// -------------- for/of - loops through the values of an iterable object    L
// Iterate over an array of objects and extract specific property values:
const students = [
  { name: "John", age: 20 },
  { name: "Jane", age: 22 },
  { name: "Alice", age: 21 },
];
const names = [];
for (let student of students) {
  names.push(student.name);
}
console.log(names); // Output: ["John", "Jane", "Alice"]

// Iterate over a string and perform character manipulation:
const message = "Hello, World!";
let reversed = "";
for (let char of message) {
  reversed = char + reversed;
}
console.log(reversed); // Output: "!dlroW ,olleH"

// Iterate over a generator function and process generated values:              

function* fibonacci() {
  let a = 0,
    b = 1;
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}
const fibSequence = [];
for (let num of fibonacci()) {
  fibSequence.push(num);
  if (fibSequence.length === 10) {
    break;
  }
}
console.log(fibSequence); // Output: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

// Iterate over a NodeList from a DOM query and perform operations on each element: // error
const elements = document.querySelectorAll(".item");
for (let element of elements) {
  element.classList.add("highlight");
}

// --------------- while - loops through a block of code while a specified condition is true   L
// Implementing a countdown timer:
let countdown = 10;
while (countdown >= 0) {
  console.log(countdown);
  countdown--;
}
console.log("Time's up!");

//////////////////////////////////////////////

// Generating a random number within a specific range:    L
function getRandomNumber(min, max) {
  let randomNumber;
  while (true) {
    randomNumber = Math.floor(Math.random() * (max - min + 1) + min);
    if (randomNumber !== 0) { // It's a precautionary measure to avoid returning zero in scenarios where a non-zero value is expected.
      break;
    }
  }
  return randomNumber;
}
const number = getRandomNumber(1, 10);
console.log(number);


//////////////////////////////////////////////

// Finding the first number divisible by both 3 and 5:
let number = 1;
while (true) {
  if (number % 3 === 0 && number % 5 === 0) {
    break;
  }
  number++;
}
console.log(number);

// Simulating a game of chance:        L
let playerScore = 0;
let computerScore = 0;
while (playerScore < 5 && computerScore < 5) {
  const playerChoice = prompt("Choose rock, paper, or scissors:");
  const computerChoice =
    Math.random() < 0.33 ? "rock" : Math.random() < 0.66 ? "paper" : "scissors";

  // Compare choices and update scores
  console.log("Player Score:", playerScore);
  console.log("Computer Score:", computerScore);
}
console.log("Game Over!");

// do/while - also loops through a block of code while a specified condition is true
// Prompting for valid user input:
// let userInput;
// do {
//   userInput = prompt("Please enter a number greater than 5:");
// } while (isNaN(userInput) || Number(userInput) <= 5);
// console.log("Valid input received:", userInput);

// Calculating the factorial of a number:        L
let number = 6;
let factorial = 1;
let i = 1;
do {
  factorial *= i;
  i++;
} while (i <= number);
console.log("Factorial of", number, "is", factorial);
///////////////////////////////////////////////////////////////////////////

// Guessing game with limited attempts:
const secretNumber = Math.floor(Math.random() * 100) + 1;
let guess;
let attempts = 0;
do {
  guess = Number(prompt("Guess the secret number (between 1 and 100):"));
  attempts++;
  if (guess === secretNumber) {
    console.log(
      "Congratulations! You guessed the secret number in",
      attempts,
      "attempts."
    );
  } else if (guess < secretNumber) {
    console.log("Too low. Try again.");
  } else {
    console.log("Too high. Try again.");
  }
} while (guess !== secretNumber && attempts < 5);
if (attempts === 5) {
  console.log("Out of attempts. The secret number was", secretNumber);
}
///////////////////////////////////////////////////////////////////////////
// Generating a random password with specific criteria:
const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const numbers = "0123456789";
const symbols = "!@#$%^&*()";
let password = "";
let length = 8;
do {
  password = "";
  for (let i = 0; i < length; i++) {
    const charSet =
      i % 4 === 0
        ? lowercaseChars
        : i % 4 === 1
          ? uppercaseChars
          : i % 4 === 2
            ? numbers
            : symbols;
    const randomIndex = Math.floor(Math.random() * charSet.length);
    password += charSet[randomIndex];
  }
  length++;
} while (
  !/[a-z]/.test(password) ||
  !/[A-Z]/.test(password) ||
  !/[0-9]/.test(password) ||
  !/[!@#$%^&*()]/.test(password)
);
console.log("Generated password:", password);

// ----------------------- For In - (over object & array) The JavaScript for in statement loops through the properties of an Object: for (key in object) {code block to be executed} - for loop, a for of loop, or Array.forEach() better if index order is important

// Iterate over the properties of an object and perform complex operations:
const person = {
  name: "John",
  age: 30,
  city: "New York",
};
for (let key in person) {
  if (key === "name") {
    console.log("The person's name is", person[key]);
  } else if (key === "age") {
    console.log("The person's age is", person[key]);
  } else {
    console.log("The person is from", person[key]);
  }
}
///////////////////////////////////////////////////////////////////////////
// Iterate over an object and calculate the sum of numeric values:  L
const data = {
  apples: 5,
  oranges: 8,
  bananas: 3,
};
let sum = 0;
for (let key in data) {
  if (typeof data[key] === "number") {
    sum += data[key];
  }
}
console.log("Total number of fruits:", sum);

///////////////////////////////////////////////////////////////////////////

// Iterate over an array-like object and perform specific actions:
const str = "Hello, World!";
const arrayLike = {
  0: "H",
  1: "e",
  2: "l",
  3: "l",
  4: "o",
  length: 5,
};
for (let index in arrayLike) {
  console.log(str[index]);
}

///////////////////////////////////////////////////////////////////////////
// Iterate over an object's properties and skip inherited properties:
const student = {
  name: "John",
  age: 20,
};
// student.__proto__.grade = "A";
for (let key in student) {
  if (student.hasOwnProperty(key)) {
    console.log(key + ": " + student[key]);
  }
}

///////////////////////////////////////////////////////////////////////////
//------------------------------- Array.forEach()
// Calculate the sum and product of an array of numbers:
const numbers = [2, 4, 6, 8];
let sum = 0;
let product = 1;
numbers.forEach((number) => {
  sum += number;
  product *= number;
});
console.log("Sum:", sum);
console.log("Product:", product);

///////////////////////////////////////////////////////////////////////////
// Find the longest word in an array of strings:   L
const words = ["apple", "banana", "coconut", "dragonfruit"];
let longestWord = "";
words.forEach((word) => {
  if (word.length > longestWord.length) {
    longestWord = word;
  }
});
console.log("Longest word:", longestWord);


///////////////////////////////////////////////////////////////////////////
// Convert an array of strings to uppercase:
const names = ["john", "sarah", "alex"];
const uppercaseNames = [];
names.forEach((name, index) => {
  uppercaseNames[index] = name.toUpperCase();
});
console.log("Uppercase names:", uppercaseNames);

// Remove duplicates from an array:
const numbers = [1, 2, 2, 3, 4, 4, 5, 5];
const uniqueNumbers = [];
numbers.forEach((number) => {
  if (!uniqueNumbers.includes(number)) {
    uniqueNumbers.push(number);
  }
});
console.log("Unique numbers:", uniqueNumbers);

//----------------For Of -    L
// Summing the values of an array of arrays:
const arrays = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];
let sum = 0;
for (const array of arrays) {
  for (const value of array) {
    sum += value;
  }
}
console.log("Sum:", sum);

// Finding the average length of strings in an array:
const strings = ["apple", "banana", "coconut", "dragonfruit"];
let totalLength = 0;
for (const string of strings) {
  totalLength += string.length;
}
const averageLength = totalLength / strings.length;
console.log("Average length:", averageLength);

// Counting the number of occurrences of each letter in a string:
const text = "Hello, World!";
const letterCounts = {};
for (const letter of text) {
  if (letter in letterCounts) {
    letterCounts[letter]++;
  } else {
    letterCounts[letter] = 1;
  }
}
console.log("Letter counts:", letterCounts);

// Extracting unique values from nested arrays:
const nestedArrays = [
  [1, 2, 3],
  [4, 5, 6],
  [1, 3, 5, 7],
];
const uniqueValues = new Set();
for (const array of nestedArrays) {
  for (const value of array) {
    uniqueValues.add(value);
  }
}
console.log("Unique values:", [...uniqueValues]);

// -------------------- Looping over a String - for of
// Count the number of vowels in a string:      L
const str = "Hello, World!";
let vowelCount = 0;
for (const char of str) {
  const lowercaseChar = char.toLowerCase();
  if ("aeiou".includes(lowercaseChar)) {
    vowelCount++;
  }
}
console.log("Number of vowels:", vowelCount);

// Reverse a string:
const str = "Hello, World!";
let reversedString = "";
for (const char of str) {
  reversedString = char + reversedString;
}
console.log("Reversed string:", reversedString);

///////////////////////////////////////////////////////////////////////////

// Remove whitespace from a string:
const str = "   Hello, World!   ";
let trimmedString = "";
for (const char of str) {
  if (char !== " ") {
    trimmedString += char;
  }
}
console.log("Trimmed string:", trimmedString);

///////////////////////////////////////////////////////////////////////////

// Check if a string is a palindrome:
const str = "madam";
let isPalindrome = true;
for (let i = 0; i < Math.floor(str.length / 2); i++) {
  if (str[i] !== str[str.length - 1 - i]) {
    isPalindrome = false;
    break;
  }
}
console.log("Is palindrome:", isPalindrome);

// ------------------------- While loop -
// Countdown from 5 to 1:
let count = 5;
while (count >= 1) {
  console.log(count);
  count--;
}

// Generating random numbers until a condition is met:
let randomNumber = Math.random();
let iterations = 0;
while (randomNumber < 0.8) {
  iterations++;
  randomNumber = Math.random();
}
console.log("Number of iterations:", iterations);

///////////////////////////////////////////////////////////////////////////

// Summing numbers until the sum exceeds a certain value:     L
const numbers = [10, 15, 7, 12, 9];
let sum = 0;
let index = 0;
while (sum < 40 && index < numbers.length) {
  sum += numbers[index];
  index++;
}
console.log("Sum:", sum);

///////////////////////////////////////////////////////////////////////////

// Repeatedly prompting for user input until a valid answer is provided:
let answer = "";
while (answer !== "yes" && answer !== "no") {
  answer = prompt("Please enter 'yes' or 'no':");
}
console.log("Valid answer provided:", answer);

// break & continue
// Using break to exit a loop early:
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
let targetNumber = 6;
for (const number of numbers) {
  if (number === targetNumber) {
    console.log("Number found!");
    break; // Exit the loop early
  }
  console.log(number);
}

// Using continue to skip an iteration:
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
for (const number of numbers) {
  if (number % 2 === 0) {
    continue; // Skip even numbers
  }
  console.log(number);
}

// Using break and continue together:
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
for (const number of numbers) {
  if (number === 5) {
    console.log("Encountered number 5, continuing to next iteration");
    continue; // Skip the rest of the code and move to the next iteration
  }
  if (number === 8) {
    console.log("Encountered number 8, exiting the loop");
    break; // Exit the loop early
  }
  console.log(number);
}
///////////////////////////////////////////////////////////////////////////

// Javascript Iterables are iterable objects (like Arrays) - Iterating over a String, Array, set, map
// example of creating a custom iterable object in JavaScript:
const myIterable = {
  [Symbol.iterator]() {
    let count = 1;
    return {
      next() {
        if (count <= 5) {
          return { value: count++, done: false };
        } else {
          return { done: true };
        }
      },
    };
  },
};
for (const item of myIterable) {
  console.log(item);
}

// --------------------- Sets -  collection of unique values. - set methods- new Set()	Creates a new Set - add(), delete(), has(), forEach(), values()      L

// Creating a set and adding elements:
// const mySet = new Set();
// mySet.add(1);
// mySet.add(2);
// mySet.add(3);
// mySet.add(1); // Adding a duplicate element, which will be ignored
// console.log(mySet); // Output: Set { 1, 2, 3 }

// Checking the size of a set:
const mySet = new Set([1, 2, 3, 4, 5]);
console.log(mySet.size); // Output: 5

// Checking if a set contains a specific element:
const mySet = new Set(["apple", "banana", "orange"]);
console.log(mySet.has("banana")); // Output: true
console.log(mySet.has("grape")); // Output: false

// Removing an element from a set:
const mySet = new Set([1, 2, 3, 4, 5]);
mySet.delete(3);
console.log(mySet); // Output: Set { 1, 2, 4, 5 }

// Iterating over a set using for...of loop:
const mySet = new Set(["apple", "banana", "orange"]);
for (const item of mySet) {
  console.log(item);
}

// Converting a set to an array:
const mySet = new Set([1, 2, 3, 4, 5]);
const myArray = Array.from(mySet);
console.log(myArray); // Output: [1, 2, 3, 4, 5]

// --------------------- Map - methods- new Map(), set(), get(), delete(), has(), forEach(), entries()
// Manipulating an array of numbers:
const numbers = [1, 2, 3, 4, 5];
const doubledNumbers = numbers.map((num) => num * 2);
console.log(doubledNumbers); // Output: [2, 4, 6, 8, 10]

// Converting an array of strings to uppercase:
const fruits = ["apple", "banana", "orange"];
const capitalizedFruits = fruits.map((fruit) => fruit.toUpperCase());
console.log(capitalizedFruits); // Output: ["APPLE", "BANANA", "ORANGE"]

// Mapping an array of objects to extract specific properties:
const users = [
  { id: 1, name: "John", age: 30 },
  { id: 2, name: "Jane", age: 25 },
  { id: 3, name: "Bob", age: 40 },
];
const userIds = users.map((user) => user.id);
console.log(userIds); // Output: [1, 2, 3]

// Mapping an array of objects to modify the structure:
const products = [
  { id: 1, name: "Apple", price: 1.99 },
  { id: 2, name: "Banana", price: 0.99 },
  { id: 3, name: "Orange", price: 2.49 },
];
const formattedProducts = products.map((product) => ({
  productId: product.id,
  productName: product.name,
  productPrice: product.price,
}));
console.log(formattedProducts);
/* Output:
[
  { productId: 1, productName: "Apple", productPrice: 1.99 },
  { productId: 2, productName: "Banana", productPrice: 0.99 },
  { productId: 3, productName: "Orange", productPrice: 2.49 }
]
*/

// ----------------------------In JavaScript there are 5 different data types that can contain values: string, number, boolean, object, function
// There are 6 types of objects: Object, Date, Array, String, Number, Boolean
// And 2 data types that cannot contain values: null, undefined
// The data type of NaN is number
// The data type of an array is object
// The data type of a date is object
// The data type of null is object
// The data type of an undefined variable is undefined *
// The data type of a variable that has not been assigned a value is also undefined *
// The Data Type of typeof - But, the typeof operator always returns a string (containing the type of the operand).

// constructor Property - In JavaScript, a constructor is a special function used to create and initialize objects created from a class. It is called when you use the new keyword to instantiate a new object. Constructors are defined using the same name as the class and are responsible for setting up the initial state and behavior of the object.       L

// class Person {
//   constructor(name, age) {
//     this.name = name;
//     this.age = age;
//   }
//   sayHello() {
//     console.log(`Hello, my name is ${ this.name } and I'm ${this.age} years old.`);
//   }
// }
// // Creating objects using the Person constructor
// const person1 = new Person("John", 30);
// const person2 = new Person("Jane", 25);
// person1.sayHello(); // Output: Hello, my name is John and I'm 30 years old.
// person2.sayHello(); // Output: Hello, my name is Jane and I'm 25 years old.

// instanceof Operator -  returns true if an object is an instance of the specified object .The instanceof operator in JavaScript is used to check whether an object belongs to a specific class or constructor function. It evaluates to true if the object is an instance of the specified class or a subclass, and false otherwise. In the code above, we have two classes: Rectangle and Square. The Rectangle class represents a rectangle with a given width and height, while the Square class extends the Rectangle class and represents a square with equal side lengths. We create instances of both classes, rectangle and square. Then, we use the instanceof operator to check whether each object is an instance of a specific class. In the first set of console.log statements, we check if rectangle is an instance of Rectangle and Square. Since rectangle was created using the Rectangle constructor, it is an instance of Rectangle but not Square, so the output is true and false, respectively.
// In the second set of console.log statements, we check if square is an instance of Rectangle and Square. Since square was created using the Square constructor, it is both an instance of Rectangle and Square, as Square extends Rectangle, so the output is true in both cases. The instanceof operator is useful when you want to determine the type or class of an object in JavaScript and perform specific operations or checks based on that information.
// class Rectangle {
//   constructor(width, height) {
//     this.width = width;
//     this.height = height;
//   }
//   calculateArea() {
//     return this.width * this.height;
//   }
// }
// class Square extends Rectangle {
//   constructor(side) {
//     super(side, side);
//   }
// }
// const rectangle = new Rectangle(4, 6);
// const square = new Square(5);
// console.log(rectangle instanceof Rectangle); // Output: true
// console.log(rectangle instanceof Square); // Output: false
// console.log(square instanceof Rectangle); // Output: true
// console.log(square instanceof Square); // Output: true

// void operator - evaluates an expression and returns undefined - The void operator in JavaScript evaluates an expression and then returns undefined. It is often used to explicitly indicate that a function or statement does not return a value.
// function greet() {
//   console.log("Hello!");
// }
// void greet(); // Output: Hello!

// void with an IIFE (Immediately Invoked Function Expression)
// void (function () {
//   // Code to be executed
// })();

// String() - can convert numbers to strings . toString() does the same. The toString() method in JavaScript is used to convert an object to its string representation. It is available for most built-in JavaScript objects and can also be implemented for custom objects.
const number = 42;
const numberString = number.toString();
console.log(numberString); // Output: "42"
console.log(typeof numberString); // Output: "string"

// //
const array = [1, 2, 3];
const arrayString = array.toString();
console.log(arrayString); // Output: "1,2,3"
console.log(typeof arrayString); // Output: "string"

// //
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
  toString() {
    return `Name: ${this.name}, Age: ${this.age}`;
  }
}
const person = new Person("John", 30);
const personString = person.toString();
console.log(personString); // Output: "Name: John, Age: 30"
console.log(typeof personString); // Output: "string"
// a Person class with a custom toString() method. When the method is called on a Person object, it returns a formatted string representation of the person's name and age. Note: The toString() method can be overridden in custom objects to provide a custom string representation. By default, the toString() method returns [object Object] for objects that don't have a custom implementation. The toString() method is widely used in JavaScript for converting various types of objects to strings, which can be useful for logging, displaying data, or performing string-related operations.        L

// Number() can also convert booleans to numbers. - The Number() function in JavaScript can also convert boolean values to numbers. When a boolean value is passed to the Number() function, it is automatically converted to either 1 for true or 0 for false.
// Converting true to a number
// const booleanValue = true;
// const numberValue = Number(booleanValue);
// console.log(numberValue); // Output: 1
// console.log(typeof numberValue); // Output: "number"// In this example, the boolean value true is passed to the Number() function. It is automatically converted to the number 1. The resulting value is stored in the numberValue variable.

// // Converting false to a number
// const booleanValue = false;
// const numberValue = Number(booleanValue);
// console.log(numberValue); // Output: 0
// console.log(typeof numberValue); // Output: "number" // when the boolean value false is passed to the Number() function, it is converted to the number 0. Converting boolean values to numbers can be useful in scenarios where you need to perform numeric operations or comparisons with boolean values. However, it's important to note that this behavior may not always be intuitive, so it's recommended to use the Number() function explicitly when you want to convert boolean values to numbers.   L

// ------------------------------------------------------------
// string Methods - replace(), search()
// Using the replace() method

// const message = "Hello, World!";
// const newMessage = message.replace("World", "John");
// console.log(newMessage); // Output: "Hello, John!" - replace() method is used to replace the substring "World" with "John" in the message string. The resulting string newMessage will contain the modified text "Hello, John!".

// Using the search() method
// const sentence = "JavaScript is a powerful language";
// const searchTerm = "powerful";
// const position = sentence.search(searchTerm);
// console.log(position); // Output: 12 - the search() method is used to find the position of the first occurrence of the searchTerm in the sentence string. It returns the index of the first character of the found substring. In this case, the searchTerm "powerful" is found at index 12 in the sentence string.

// test - RegExp     L
// -------------------------------Throw, and Try...Catch...Finally
// throw to throw an exception -  the divideByZero() function checks if the input number is zero. If it is, it throws an exception with the message "Cannot divide by zero!". Inside the try block, we attempt to call the function with divideByZero(0). Since dividing by zero is not allowed, the exception is thrown. The catch block catches the exception and logs the error message.
// function divideByZero(number) {
//   if (number === 0) {
//     throw "Cannot divide by zero!";
//   }
//   return 10 / number;
// }
// try {
//   const result = divideByZero(0);
//   console.log(result);
// } catch (error) {
//   console.log("Error:", error);
// }

//  Using try...catch...finally to handle exceptions -  the readJSON() function attempts to parse a JSON string using JSON.parse(). Inside the try block, we parse the JSON string and log the parsed data. If an error occurs during parsing, the catch block catches the error and logs an appropriate message. The finally block always executes, regardless of whether an exception occurred or not. In this case, it logs "Finished parsing JSON."The throw statement is used to manually throw an exception, allowing you to specify custom error messages or objects. The try...catch...finally statement provides a way to handle exceptions, allowing you to catch and handle errors gracefully and execute cleanup code in the finally block.         L
// function readJSON(jsonString) {
//   try {
//     const parsedData = JSON.parse(jsonString);
//     console.log("Parsed data:", parsedData);
//   } catch (error) {
//     console.log("Error while parsing JSON:", error);
//   } finally {
//     console.log("Finished parsing JSON.");
//   }
// }
// readJSON('{"name":"John", "age":30}');
// readJSON('{"name":"Jane", "age":'); // Invalid JSON

// ------------------------------------------------------------
// JavaScript Initializations are Not Hoisted

// ------------------------------------------------objects
// Accessing object properties
const person = {
  name: "John",
  age: 30,
  city: "New York",
};
console.log(person.name); // Output: "John"
console.log(person.age); // Output: 30
console.log(person.city); // Output: "New York"

// Adding and modifying object properties
const car = {
  make: "Toyota",
  model: "Camry",
  year: 2020,
};
car.color = "Blue";
car.year = 2022;
console.log(car); // Output: { make: "Toyota", model: "Camry", year: 2022, color: "Blue" }

// // Object methods
const calculator = {
  add: function (a, b) {
    return a + b;
  },
  subtract: function (a, b) {
    return a - b;
  },
};
console.log(calculator.add(5, 3)); // Output: 8
console.log(calculator.subtract(10, 4)); // Output: 6

// ------------------------------------------------------------
// person[x] in the loop. person.x will not work (Because x is a variable).

// -----------------------------------constructor - add property and methods - built-in javascript constructors
// new String()    // A new String object
// new Number()    // A new Number object
// new Boolean()   // A new Boolean object
// new Object()    // A new Object object
// new Array()     // A new Array object
// new RegExp()    // A new RegExp object
// new Function()  // A new Function object
// new Date()      // A new Date object
// Math is a global object. The new keyword cannot be used on Math.
// Use string literals "" instead of new String().
// Use number literals 50 instead of new Number().
// Use boolean literals true / false instead of new Boolean().
// Use object literals {} instead of new Object().
// Use array literals [] instead of new Array().
// Use pattern literals /()/ instead of new RegExp().
// Use function expressions () {} instead of new Function().

// Object constructor

// Prototype Inheritance
// All JavaScript objects inherit properties and methods from a prototype: Object.prototype is on the top of the prototype inheritance chain
// Date objects inherit from Date.prototype
// Array objects inherit from Array.prototype
// Person objects inherit from Person.prototype

// Creating a prototype chain
// Parent constructor function
function Animal(name) {
  this.name = name;
}
// Prototype method of the parent constructor
Animal.prototype.sound = function () {
  console.log("Animal sound");
};

// Child constructor function
function Dog(name, breed) {
  Animal.call(this, name);
  this.breed = breed;
}

// Inheriting from the parent prototype
Dog.prototype = Object.create(Animal.prototype);

// Prototype method of the child constructor
Dog.prototype.bark = function () {
  console.log("Bark!");
};

// Creating an instance of the child object
const dog = new Dog("Max", "Labrador");

// Accessing properties and invoking methods
console.log(dog.name); // Output: "Max"
console.log(dog.breed); // Output: "Labrador"
dog.sound(); // Output: "Animal sound"
dog.bark(); // Output: "Bark!"
// we create a parent constructor function Animal that sets the name property and defines a sound method on its prototype. The child constructor function Dog calls the parent constructor using Animal.call(this, name) to inherit the name property and sets its own breed property. We establish the prototype inheritance relationship between Dog and Animal using Object.create(Animal.prototype). Finally, we add a bark method to the Dog prototype.

// Modifying the parent prototype affects child instances
function Person(name) {
  this.name = name;
}

Person.prototype.greet = function () {
  console.log(`Hello, my name is ${this.name}`);
};

function Employee(name, position) {
  Person.call(this, name);
  this.position = position;
}

Employee.prototype = Object.create(Person.prototype);

// Modifying the parent prototype
Person.prototype.greet = function () {
  console.log(`Hey there, I'm ${this.name}`);
};

const employee = new Employee("John", "Manager");
employee.greet(); // Output: "Hey there, I'm John"
// we have a parent constructor function Person with a greet method on its prototype. The child constructor function Employee inherits from Person. However, after the inheritance, we modify the greet method on the parent's prototype. As a result, the modification affects instances of both Person and Employee.

// ------------------------------------------------------------
// Iterables - Iterable objects are objects that can be iterated over with for..of. Technically, iterables must implement the Symbol.iterator method.   L

// --------------------------------------------------------Sets
// new Set()	Creates a new Set
// add()	Adds a new element to the Set
// delete()	Removes an element from a Set
// has()	Returns true if a value exists
// clear()	Removes all elements from a Set
// forEach()	Invokes a callback for each element
// values()	Returns an Iterator with all the values in a Set
// keys()	Same as values()
// entries()	Returns an Iterator with the [value,value] pairs from a Set

// --------------------------------------------------------Maps
// new Map()	Creates a new Map object
// set()	Sets the value for a key in a Map
// get()	Gets the value for a key in a Map
// clear()	Removes all the elements from a Map
// delete()	Removes a Map element specified by a key
// has()	Returns true if a key exists in a Map
// forEach()	Invokes a callback for each key/value pair in a Map
// entries()	Returns an iterator object with the [key, value] pairs in a Map
// keys()	Returns an iterator object with the keys in a Map
// values()	Returns an iterator object of the values in a Map

// -----------------------------------------------Function execution and declaration

// ------------------------------------------------------------
// Function parameters are the names listed in the function definition. Function arguments are the real values passed to (and received by) the function.

// Function Rest Parameter
// Summing an arbitrary number of arguments - sum function uses the rest parameter ...numbers to accept any number of arguments passed to it. The rest parameter gathers all the arguments into an array named numbers. We then use the reduce method to sum up all the numbers in the array.    L
function sum(...numbers) {
  return numbers.reduce((total, num) => total + num, 0);
}
console.log(sum(1, 2, 3)); // Output: 6
console.log(sum(4, 5, 6, 7, 8)); // Output: 30

// Concatenating strings with a separator - the joinStrings function takes a separator as the first argument, followed by any number of strings as additional arguments using the rest parameter ...strings. The rest parameter gathers all the strings into an array. We then use the join method to concatenate the strings with the provided separator.
function joinStrings(separator, ...strings) {
  return strings.join(separator);
}
console.log(joinStrings("-", "Hello", "world")); // Output: "Hello-world"
console.log(joinStrings(" ", "JavaScript", "is", "awesome")); // Output: "JavaScript is awesome"

// Finding the maximum value among a set of numbers - the findMax function accepts an arbitrary number of arguments using the rest parameter ...numbers. The rest parameter gathers all the numbers into an array. We then use the spread operator ... to spread the array elements as individual arguments to the Math.max function, which returns the maximum value among the numbers.               L
function findMax(...numbers) {
  return Math.max(...numbers);
}
console.log(findMax(3, 9, 2, 7)); // Output: 9
console.log(findMax(1, 5, 8, 4, 2)); // Output: 8

// ------------------------------------------- Call, apply , bind
// The call() method takes arguments separately. The apply() method takes arguments as an array.

// ------------------------------------------closure k examples - A closure is formed when an inner function retains access to variables from its outer lexical environment, even after the outer function has finished executing. Closures are powerful in creating encapsulated and private data within functions, allowing for data privacy and the preservation of state across multiple function calls.

// Counter using a closure -  the createCounter function returns an inner function increment, which has access to the count variable defined in the outer scope. The increment function forms a closure that "remembers" the count variable even after the createCounter function has finished executing. Each time the increment function is invoked, it increments the count variable and logs its value.

function createCounter() {
  let count = 0;
  function increment() {
    count++;
    console.log(count);
  }
  return increment;
}
const counter = createCounter();
counter(); // Output: 1
counter(); // Output: 2
counter(); // Output: 3

// Private variable using a closure javascript - the createPerson function returns an object with methods that have access to the name and age variables defined in the outer scope. The getAge and increaseAge functions form closures that retain access to the age variable. The getAge method returns the current value of age, while the increaseAge method increments the age variable.
function createPerson(name) {
  let age = 0;
  function getAge() {
    return age;
  }
  function increaseAge() {
    age++;
  }
  return {
    getName: () => name,
    getAge,
    increaseAge,
  };
}
const person = createPerson("John");
console.log(person.getName()); // Output: "John"
console.log(person.getAge()); // Output: 0
person.increaseAge();
console.log(person.getAge()); // Output: 1

//  Event handling with closures -  the createButton function creates a button element and attaches an event listener to it using the addEventListener method. The event listener function forms a closure that has access to the count variable defined in the outer scope. Each time the button is clicked, the event listener function increments the count variable and logs the number of times the button has been clicked.
function createButton() {
  let count = 0;
  const button = document.createElement("button");
  button.textContent = "Click Me";
  button.addEventListener("click", function () {
    count++;
    console.log(`Button clicked ${count} times`);
  });
  return button;
}
const button = createButton();
document.body.appendChild(button);

const add = (function () {
  let counter = 0;
  return function () {
    counter += 1;
    return counter;
  };
})();

console.log(add());
console.log(add());
console.log(add());

//  L -------------------------------Callbacks - A callback is a function passed as an argument to another function. Callbacks are a fundamental concept in JavaScript and are commonly used for handling asynchronous operations, event handling, and array iteration. They allow us to pass functions as arguments to other functions and execute them at a specific time or when certain conditions are met.
// Simple callback function - the greet function accepts a name parameter and a callback function. It logs a greeting message with the provided name and then invokes the callback function. In this case, the sayGoodbye function is passed as the callback, so it logs a "Goodbye!" message after the greeting.
// function greet(name, callback) {
//   console.log(`Hello, ${name}!`);
//   callback();
// }
// function sayGoodbye() {
//   console.log("Goodbye!");
// }
// greet("John", sayGoodbye);
// Output:
// Hello, John!
// Goodbye!

// Asynchronous callback with setTimeout - the fetchData function simulates an asynchronous operation by using setTimeout. After a delay of 2000 milliseconds (2 seconds), it invokes the callback function with some data. The processData function is passed as the callback, so it logs a message indicating the processing of the retrieved data.
function fetchData(callback) {
  setTimeout(function () {
    const data = "Some data";
    callback(data);
  }, 2000);
}
function processData(data) {
  console.log(`Processing data: ${data}`);
}
// fetchData(processData);
// Output (after 2 seconds):
// Processing data: Some data

function myDisplayer(some) {
  document.getElementById("demo").innerHTML = some;
}
function myCalculator(num1, num2, myCallback) {
  let sum = num1 + num2;
  myCallback(sum);
}
// myCalculator(5, 5, myDisplayer);

// In the example above, myDisplayer is a called a callback function. It is passed to myCalculator() as an argument.

// L ----------------------------Promises - Promise.then() takes two arguments, a callback for success and another for failure. Both are optional
// Basic Promise- a promise is created using the Promise constructor. Inside the promise executor function, we perform an asynchronous operation (simulated using setTimeout). If the operation is successful, we call the resolve function and pass the resolved value. If there is an error, we can call the reject function and pass an error message. // The promise is then consumed using the then and catch methods. The then method is called when the promise is resolved, and it receives the resolved value as an argument. The catch method is called when the promise is rejected, and it receives the error as an argument.
const myPromise = new Promise((resolve, reject) => {
  // Asynchronous operation
  setTimeout(() => {
    const data = "Promise resolved";
    resolve(data); // Resolve the promise with data
    // reject("Promise rejected"); // Reject the promise with an error
  }, 2000);
});
myPromise
  .then((data) => {
    console.log(data); // Output: Promise resolved
  })
  .catch((error) => {
    console.log(error); // Output: Promise rejected
  });

// Promise chaining -  we have two functions that return promises: getData and processData. The getData function simulates fetching some data, and the processData function simulates processing the fetched data. The promises are chained using the then method to perform sequential operations. The resolved value from one promise is passed as an argument to the next then callback.
function getData() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const data = "Data fetched";
      resolve(data);
    }, 2000);
  });
}
function processData(data) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const processedData = `${data} and processed`;
      resolve(processedData);
    }, 2000);
  });
}
getData()
  .then(processData)
  .then((result) => {
    console.log(result); // Output: Data fetched and processed
  })
  .catch((error) => {
    console.log(error);
  });

// L Promise.all - we use Promise.all to wait for multiple promises to resolve. The Promise.all method takes an array of promises and returns a new promise that is fulfilled when all the promises in the array are resolved. The then callback receives an array of resolved values in the same order as the input promises.
const promise1 = Promise.resolve("Promise 1 resolved");
const promise2 = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve("Promise 2 resolved");
  }, 2000);
});
const promise3 = Promise.reject("Promise 3 rejected");
Promise.all([promise1, promise2])
  .then((results) => {
    console.log(results); // Output: ["Promise 1 resolved", "Promise 2 resolved"]
  })
  .catch((error) => {
    console.log(error);
  });

// ------------------------------------------------------------Server side validation is performed by a web server, after input has been sent to the server. Client side validation is performed by a web browser, before input is sent to a web server.





//////////////////////////////////////////////// L

// Sure, let's discuss the time complexities of common operations when working with arrays and objects in JavaScript.

// ### Arrays:

// 1. ** Access(by index):**
//   - Time Complexity: O(1)
//     - Accessing an element by its index is a constant - time operation.

// 2. ** Insertion / Deletion(at the end):**
//   - Time Complexity: O(1)
//     - Adding or removing an element at the end of an array is a constant - time operation.

// 3. ** Insertion / Deletion(at the beginning or middle):**
//   - Time Complexity: O(n)
//     - Adding or removing an element at the beginning or middle of an array requires shifting other elements, resulting in a linear time operation.

// 4. ** Search(Linear Search):**
//   - Time Complexity: O(n)
//     - Searching for an element in an array using linear search may require traversing the entire array.

// 5. ** Search(Binary Search):**
//   - Time Complexity: O(log n)
//     - Binary search is applicable only on sorted arrays and has a logarithmic time complexity.

// ### Objects(Hash Maps in JavaScript):

// 1. ** Insertion / Deletion / Search:**
//   - Time Complexity: O(1) on average
//     - JavaScript objects are implemented as hash maps, and average -case time complexity for insertion, deletion, and search is constant.

// ### Summary:

// - Arrays are generally good for random access by index and have constant - time complexity for such operations.
// - Arrays can be inefficient for frequent insertions or deletions in the middle or beginning due to shifting elements.
// - Objects(hash maps) are efficient for constant - time insertion, deletion, and search on average.
// - Use arrays when you need ordered collections, and use objects when you need key - value pairs and fast access by key.

// Understanding the time complexities of these operations helps in choosing the appropriate data structure for specific use cases.Keep in mind that these complexities are generalizations, and real - world performance can depend on various factors and JavaScript engine optimizations.
////////////////////////////////////////////////
// code Q
// rotate array by 2 places - to right, to left
// reverse sentence word by word - inbuilt and loop
// reverse sentence fully - inbuilt and loop
// array , output at index is sum of all other indexes
//
//
//
//
//
//
//
//
//
//
//
//
//




////////////////////////////////////////////////
// We'll pass you an array of two numbers. Return the sum of those two numbers plus the sum of all the numbers between them. The lowest number will not always come first.
// For example, sumAll([4, 1]) should return 10 because sum of all the numbers between 1 and 4(both inclusive) is 10.
function sumAll(arr) {
  // Find the minimum and maximum values in the array
  const min = Math.min(...arr);
  const max = Math.max(...arr);

  // Use the arithmetic sum formula to calculate the sum of numbers between min and max
  const sumBetween = ((max - min + 1) * (min + max)) / 2;

  return sumBetween;
}

// Example usage:
console.log(sumAll([4, 1])); // Output: 10




////////////////////////////////////////////////

// Compare two arrays and return a new array with any items only found in one of the two given arrays, but not both. In other words, return the symmetric difference of the two arrays. Note: You can return the array with its elements in any order.
function diffArray(arr1, arr2) {
  const newArr = [];
  // Function to find the difference between two arrays
  const findDifference = (a, b) => a.filter(item => !b.includes(item));
  // Find differences in both directions and concatenate them
  newArr.push(...findDifference(arr1, arr2), ...findDifference(arr2, arr1));
  return newArr;
}

// Example usage:
const result = diffArray([1, 2, 3, 5], [1, 2, 3, 4, 5]);
console.log(result); // Output: [4]


////////////////////////////////////////////////
// Store Multiple Values in one Variable using JavaScript Arrays
// With JavaScript array variables, we can store several pieces of data in one place.

// You start an array declaration with an opening square bracket, end it with a closing square bracket, and put a comma between each entry, like this:

// const sandwich = ["peanut butter", "jelly", "bread"];
// Modify the new array myArray so that it contains both a string and a number(in that order).

function destroyer(arr, ...args) {
  // Use filter to keep only the elements not present in args
  return arr.filter(item => !args.includes(item));
}

// Example usage:
const result = destroyer([1, 2, 3, 1, 2, 3], 2, 3);
console.log(result); // Output: [1, 1]

////////////////////////////////////////////////

// Wherefore art thou
// Make a function that looks through an array of objects(first argument) and returns an array of all objects that have matching name and value pairs(second argument). Each name and value pair of the source object has to be present in the object from the collection if it is to be included in the returned array.

// For example, if the first argument is[{ first: "Romeo", last: "Montague" }, { first: "Mercutio", last: null }, { first: "Tybalt", last: "Capulet" }], and the second argument is { last: "Capulet" }, then you must return the third object from the array(the first argument), because it contains the name and its value, that was passed on as the second argument.

// Certainly! You can use the `filter` method to achieve this.Here's the modified code:

// javascript
function whatIsInAName(collection, source) {
  // Filter the collection based on matching name and value pairs
  return collection.filter(item => {
    for (let key in source) {
      // Check if the key-value pair is present in the item
      if (item[key] !== source[key]) {
        return false;
      }
    }
    // If all key-value pairs match, include the item in the result
    return true;
  });
}

// Example usage:
const result = whatIsInAName(
  [
    { first: "Romeo", last: "Montague" },
    { first: "Mercutio", last: null },
    { first: "Tybalt", last: "Capulet" }
  ],
  { last: "Capulet" }
);

console.log(result); // Output: [{ first: "Tybalt", last: "Capulet" }]


// In this function, `filter` is used to iterate through each item in the collection and only include items that match all the name and value pairs from the `source` object.The example usage demonstrates the case where the last name is "Capulet," and it returns the expected result.
// Freecodecamp DSA
// ////////////////////////////////////////////////
// Spinal Tap Case
// Convert a string to spinal case. Spinal case is all - lowercase - words - joined - by - dashes.



////////////////////////////////////////////////

// Spinal Tap Case
// Convert a string to spinal case. Spinal case is all - lowercase - words - joined - by - dashes.


// You can use a regular expression along with the`replace` method to convert the string to spinal case. Here's the modified code:

// javascript
function spinalCase(str) {
  // Replace spaces and underscores with dashes
  str = str.replace(/[\s_]/g, '-');
  // Convert camel case to separate words
  str = str.replace(/([a-z])([A-Z])/g, '$1-$2');
  // Convert to lowercase
  return str.toLowerCase();
}

// Example usage:
const result = spinalCase('This Is Spinal Tap');
console.log(result); // Output: "this-is-spinal-tap"


// In this function, the regular expression `/[\s_]/g` matches spaces and underscores, and they are replaced with dashes.The second regular expression `([a-z])([A-Z])` captures a lowercase letter followed by an uppercase letter and inserts a dash between them.Finally, the entire string is converted to lowercase.The example usage demonstrates the conversion of "

// ////////////////////////////////////////////////
// Pig Latin
// Pig Latin is a way of altering English Words.The rules are as follows:

// - If a word begins with a consonant, take the first consonant or consonant cluster, move it to the end of the word, and add ay to it.

// - If a word begins with a vowel, just add way at the end.
// Translate the provided string to Pig Latin. Input strings are guaranteed to be English words in all lowercase.




//   Certainly! Here's an updated version of the `translatePigLatin` function that handles words without vowels:

// javascript
function translatePigLatin(str) {
  // Check if the word has no vowels
  if (!/[aeiou]/.test(str)) {
    return str + 'ay';
  }

  // Check if the word starts with a vowel
  if (/^[aeiou]/.test(str)) {
    return str + 'way';
  } else {
    // Find the index of the first vowel
    const index = str.search(/[aeiou]/);
    // Move the consonant cluster to the end and add 'ay'
    return str.slice(index) + str.slice(0, index) + 'ay';
  }
}

// Example usage:
const result = translatePigLatin("rhythm");
console.log(result); // Output: "rhythmay"


// This updated version includes a check for words without vowels. If a word doesn't contain any vowels, it simply adds 'ay' at the end. The example usage demonstrates the translation of "rhythm" to "rhythmay".




////////////////////////////////////////////////

// Search and Replace
// Perform a search and replace on the sentence using the arguments provided and return the new sentence.

// First argument is the sentence to perform the search and replace on.

// Second argument is the word that you will be replacing(before).

// Third argument is what you will be replacing the second argument with (after).

//   Note: Preserve the case of the first character in the original word when you are replacing it.For example if you mean to replace the word Book with the word dog, it should be replaced as Dog



function myReplace(str, before, after) {
  // Check if the first character of 'before' is uppercase
  const isUpperCase = before[0] === before[0].toUpperCase();

  // Capitalize or decapitalize 'after' based on 'before'
  const replaced = isUpperCase
    ? after[0].toUpperCase() + after.slice(1)
    : after[0].toLowerCase() + after.slice(1);

  // Perform the search and replace
  return str.replace(new RegExp("\\b" + before + "\\b", 'i'), replaced);
}

// Example usage:
const result = myReplace("I think we should look up there", "up", "Down");
console.log(result);


////////////////////////////////////////////////
// DNA Pairing
// Pairs of DNA strands consist of nucleobase pairs.Base pairs are represented by the characters AT and CG, which form building blocks of the DNA double helix.

// The DNA strand is missing the pairing element.Write a function to match the missing base pairs for the provided DNA strand.For each character in the provided string, find the base pair character.Return the results as a 2d array.

// For example, for the input GCG, return [["G", "C"], ["C", "G"], ["G", "C"]]

// The character and its pair are paired up in an array, and all the arrays are grouped into one encapsulating array.




function pairElement(str) {
  // Define the pairs
  const pairs = {
    A: "T",
    T: "A",
    C: "G",
    G: "C"
  };

  // Split the string into an array of characters and map each character to its pair
  const result = str.split("").map(char => [char, pairs[char]]);

  return result;
}

// Example usage:
const result = pairElement("GCG");
console.log(result);


////////////////////////////////////////////////

// Missing letters
// Find the missing letter in the passed letter range and return it.

// If all letters are present in the range, return undefined.




function fearNotLetter(str) {
  for (let i = 0; i < str.length - 1; i++) {
    // Check if the ASCII difference between consecutive letters is greater than 1
    if (str.charCodeAt(i + 1) - str.charCodeAt(i) > 1) {
      // Return the missing letter
      return String.fromCharCode(str.charCodeAt(i) + 1);
    }
  }

  // Return undefined if no missing letter is found
  return undefined;
}

// Example usage:
const result = fearNotLetter("abce");
console.log(result);


////////////////////////////////////////////////

// Sorted Union
// Write a function that takes two or more arrays and returns a new array of unique values in the order of the original provided arrays.

// In other words, all values present from all arrays should be included in their original order, but with no duplicates in the final array.

// The unique numbers should be sorted by their original order, but the final array should not be sorted in numerical order.

// Check the assertion tests for examples.



function uniteUnique(...arrays) {
    // Concatenate all arrays into one array      L
    const concatenatedArray = [].concat(...arrays);

    // Use a Set to filter out duplicates while preserving order
    const uniqueArray = [...new Set(concatenatedArray)];

    return uniqueArray;
  }

// Example usage
const result = uniteUnique([1, 3, 2], [5, 2, 1, 4], [2, 1]);
console.log(result);
// In this example, concat is used to combine all arrays into a single array(concatenatedArray).Then, a Set is used to filter out duplicates, and finally, the result is converted back to an array using the spread operator ([...new Set(concatenatedArray)]).The resulting array will contain unique values in the order of their first occurrence in the input arrays.

////////////////////////////////////////////////
// Convert HTML Entities
// Convert the characters &, <, >, " (double quote), and ' (apostrophe), in a string to their corresponding HTML entities.



// You can use a simple approach by replacing the specified characters with their corresponding HTML entities.Here's how you can implement it:

// javascript
function convertHTML(str) {
  // Define a mapping of characters to their HTML entities
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  };

  // Use replace function with a regular expression to replace characters
  return str.replace(/[&<>"']/g, match => htmlEntities[match]);
}

// Example usage
const result = convertHTML("Dolce & Gabbana");
console.log(result);


// In this example, the`replace` function is used with a regular expression(`/[&<>"']/g`) to match any occurrences of the specified characters(`&`, `<`, `>`, `"`, and`'`).The matched character is then replaced with its corresponding HTML entity using the `htmlEntities` object.The resulting string will have the specified characters replaced with their HTML entities.


// ////////////////////////////////////////////////
// Sum All Odd Fibonacci Numbers
// Given a positive integer num, return the sum of all odd Fibonacci numbers that are less than or equal to num.

// The first two numbers in the Fibonacci sequence are 0 and 1. Every additional number in the sequence is the sum of the two previous numbers.The first seven numbers of the Fibonacci sequence are 0, 1, 1, 2, 3, 5 and 8.

// For example, sumFibs(10) should return 10 because all odd Fibonacci numbers less than or equal to 10 are 1, 1, 3, and 5.




// You can achieve this by generating Fibonacci numbers up to the given limit(`num`) and summing up the odd ones.Here's an implementation for the `sumFibs` function:

javascript
function sumFibs(num) {
  let prev = 0;
  let current = 1;
  let sum = 0;

  while (current <= num) {
    if (current % 2 !== 0) {
      sum += current;
    }

    const next = prev + current;
    prev = current;
    current = next;
  }

  return sum;
}

// Example usage
const result = sumFibs(4);
console.log(result); // Output: 5


// In this example, we use a `while` loop to generate Fibonacci numbers until the current Fibonacci number is greater than`num`.Inside the loop, we check if the current Fibonacci number is odd(`current % 2 !== 0`).If it is, we add it to the`sum`.Finally, we update the `prev` and `current` variables to generate the next Fibonacci number.The result is the sum of all odd Fibonacci numbers less than or equal to the given`num`.



// ////////////////////////////////////////////////
// Sum All Primes
// A prime number is a whole number greater than 1 with exactly two divisors: 1 and itself.For example, 2 is a prime number because it is only divisible by 1 and 2. In contrast, 4 is not prime since it is divisible by 1, 2 and 4.

// Rewrite sumPrimes so it returns the sum of all prime numbers that are less than or equal to num.



// To solve this problem, you can create a helper function to check whether a number is prime or not.Then, iterate through the numbers from 2 to the given`num`, and sum up the prime numbers.Here's an implementation:

// javascript          L
function isPrime(number) {
  if (number < 2) {
    return false;
  }

  for (let i = 2; i <= Math.sqrt(number); i++) {
    if (number % i === 0) {
      return false;
    }
  }

  return true;
}

function sumPrimes(num) {
  let sum = 0;

  for (let i = 2; i <= num; i++) {
    if (isPrime(i)) {
      sum += i;
    }
  }

  return sum;
}

// Example usage
const result = sumPrimes(10);
console.log(result); // Output: 17


// In this example, the`isPrime` function checks whether a given number is prime.The `sumPrimes` function then iterates through numbers from 2 to`num`, and for each prime number, it adds it to the`sum`.Finally, the total sum of prime numbers less than or equal to `num` is returned.

// ////////////////////////////////////////////////


// Smallest Common Multiple
// Find the smallest common multiple of the provided parameters that can be evenly divided by both, as well as by all sequential numbers in the range between these parameters.

// The range will be an array of two numbers that will not necessarily be in numerical order.

// For example, if given 1 and 3, find the smallest common multiple of both 1 and 3 that is also evenly divisible by all numbers between 1 and 3. The answer here would be 6.



// To find the smallest common multiple that can be evenly divided by all numbers in the given range, you can use the least common multiple(LCM) algorithm.Here's an implementation:

// javascript
function gcd(a, b) {
  // Calculate the greatest common divisor using Euclidean algorithm
  return b === 0 ? a : gcd(b, a % b);
}

function lcm(a, b) {
  // Calculate the least common multiple using the formula: lcm(a, b) = (a * b) / gcd(a, b)
  return (a * b) / gcd(a, b);
}

function smallestCommons(arr) {
  // Sort the array in ascending order
  arr.sort((a, b) => a - b);

  // Initialize the result to the first number in the range
  let result = arr[0];

  // Iterate through the range and calculate the LCM
  for (let i = arr[0] + 1; i <= arr[1]; i++) {
    result = lcm(result, i);
  }

  return result;
}

// Example usage
const result = smallestCommons([1, 5]);
console.log(result); // Output: 60


// In this example, the`gcd` function calculates the greatest common divisor, and the `lcm` function calculates the least common multiple using the formula: `lcm(a, b) = (a * b) / gcd(a, b)`.The `smallestCommons` function then iterates through the range of numbers, updating the result with the LCM at each step.The final result is the smallest common multiple for the given range.

// ////////////////////////////////////////////////

// Drop it
// Given the array arr, iterate through and remove each element starting from the first element(the 0 index) until the function func returns true when the iterated element is passed through it.

// Then return the rest of the array once the condition is satisfied, otherwise, arr should be returned as an empty array.


// You can achieve this by using the `splice` method to remove elements from the beginning of the array until the condition specified by the `func` function is met.Here's an implementation:

// javascript
function dropElements(arr, func) {
  // Find the index of the first element that satisfies the condition
  let index = arr.findIndex(func);

  // If a satisfying element is found, remove elements from the beginning up to that index
  if (index !== -1) {
    arr.splice(0, index);
  } else {
    // If no satisfying element is found, set the array to an empty array
    arr = [];
  }

  return arr;
}

// Example usage
const result = dropElements([1, 2, 3], function (n) {
  return n < 3;
});

console.log(result); // Output: [1, 2, 3]


// In this example, `findIndex` is used to find the index of the first element that satisfies the condition specified by the `func` function. If such an element is found, the`splice` method is used to remove elements from the beginning of the array up to that index.If no satisfying element is found, the array is set to an empty array.The resulting array is then returned.
//   ////////////////////////////////////////////////


//   Steamroller
// Flatten a nested array.You must account for varying levels of nesting.


// To flatten a nested array with varying levels of nesting, you can use a recursive approach.Here's an implementation for the `steamrollArray` function:

// javascript
function steamrollArray(arr) {
  const result = [];

  function flatten(element) {
    if (Array.isArray(element)) {
      // If the element is an array, recursively flatten it
      element.forEach(flatten);
    } else {
      // If the element is not an array, add it to the result
      result.push(element);
    }
  }

  // Start the flattening process
  arr.forEach(flatten);

  return result;
}

// Example usage
const result = steamrollArray([1, [2], [3, [[4]]]]);
console.log(result); // Output: [1, 2, 3, 4]


// In this example, the`steamrollArray` function uses a helper function called `flatten` to handle the flattening process.If an element is an array, it recursively calls itself on each element of the array.If the element is not an array, it adds it to the result array.The `forEach` method is used to iterate through the input array and start the flattening process.The resulting flattened array is then returned.

////////////////////////////////////////////////
// Binary Agents
// Return an English translated sentence of the passed binary string.
// The binary string will be space separated.


// To convert a binary string into an English sentence, you can split the binary string into individual bytes, convert each byte into its decimal equivalent, and then use the `String.fromCharCode` method to get the corresponding ASCII character.Here's an implementation:

javascript
function binaryAgent(str) {
  // Split the binary string into an array of binary bytes
  const binaryBytes = str.split(" ");

  // Convert each binary byte to its decimal equivalent and then to the corresponding ASCII character
  const result = binaryBytes.map(binaryByte => String.fromCharCode(parseInt(binaryByte, 2)));

  // Join the characters to form the final sentence
  return result.join("");
}

// // Example usage
// const result = binaryAgent("01000001 01110010 01100101 01101110 00100111 01110100 00100000 01100010 01101111 01101110 01100110 01101001 01110010 01100101 01110011 00100000 01100110 01110101 01101110 00100001 00111111");
// console.log(result); // Output: "Aren't bonfires fun!?"


// In this example, `split(" ")` is used to split the binary string into an array of binary bytes.Then, `map` is used to convert each binary byte to its decimal equivalent using`parseInt(binaryByte, 2)`, and`String.fromCharCode` is used to get the corresponding ASCII character.Finally, `join("")` is used to join the characters into the final sentence.



////////////////////////////////////////////////
// Everything Be True
// Check if the predicate(second argument) is truthy on all elements of a collection(first argument).
// In other words, you are given an array collection of objects.The predicate pre will be an object property and you need to return true if its value is truthy.Otherwise, return false.
// In JavaScript, truthy values are values that translate to true when evaluated in a Boolean context.
//   Remember, you can access object properties through either dot notation or[] notation.


// To check if the predicate(`pre`) is truthy for all elements in the collection, you can use the `every` method along with a callback function. The callback function will check if the specified property exists and is truthy for each object in the collection.Here's the implementation:

  ```javascript
function truthCheck(collection, pre) {
  // Use the every method to check if the specified property is truthy for all objects in the collection
  return collection.every(obj => obj[pre]);
}

// Example usage
const result = truthCheck([{name: "Quincy", role: "Founder", isBot: false}, {name: "Naomi", role: "", isBot: false}, {name: "Camperbot", role: "Bot", isBot: true}], "isBot");
console.log(result); // Output: false
```

// In this example, the`every` method is used to check if the specified property(`pre`) is truthy for all objects in the collection. The callback function `obj => obj[pre]` checks if the property exists and is truthy for each object. If the property is truthy for all objects, the`every` method returns`true`; otherwise, it returns`false`.

  ////////////////////////////////////////////////

  // Arguments Optional
  // Create a function that sums two arguments together.If only one argument is provided, then return a function that expects one argument and returns the sum.

  // For example, addTogether(2, 3) should return 5, and addTogether(2) should return a function.

  // Calling this returned function with a single argument will then return the sum:

  // var sumTwoAnd = addTogether(2);
  // sumTwoAnd(3) returns 5.

  // If either argument isn't a valid number, return undefined.



  // Certainly! Here's the updated `addTogether` function to handle the case where the arguments may be floating-point numbers:

    ```javascript
function addTogether() {
  // Function to check if a value is a valid number
  function isValidNumber(num) {
    return typeof num === 'number' && !isNaN(num);
  }

  // Check the number of arguments
  if (arguments.length === 2) {
    // If two arguments are provided, check if they are valid numbers and return their sum
    const [arg1, arg2] = arguments;
    if (isValidNumber(arg1) && isValidNumber(arg2)) {
      return arg1 + arg2;
    } else {
      return undefined;
    }
  } else if (arguments.length === 1) {
    // If one argument is provided, return a function expecting another argument
    const arg1 = arguments[0];
    if (isValidNumber(arg1)) {
      return function(arg2) {
        // Check if the second argument is a valid number and return the sum
        return isValidNumber(arg2) ? arg1 + arg2 : undefined;
      };
    } else {
      return undefined;
    }
  } else {
    // If no or more than two arguments are provided, return undefined
    return undefined;
  }
}

// Example usage
console.log(addTogether(23.4, 30)); // Output: 53.4
console.log(addTogether(2, "3")); // Output: undefined
console.log(addTogether(2)([3])); // Output: undefined
```

// In this updated implementation, the`isValidNumber` function checks if a value is a valid number(including floating - point numbers).The `addTogether` function has been modified accordingly to handle floating - point numbers as well.

// ////////////////////////////////////////////////
// Make a Person
// Fill in the object constructor with the following methods below:

getFirstName()
getLastName()
getFullName()
setFirstName(first)
setLastName(last)
setFullName(first, last)
// Run the tests to see the expected output for each method.These methods must be the only available means of interacting with the object.Each test will declare a new Person instance as new Person('Bob', 'Ross').



// I apologize for the oversight.Let's modify the `Person` constructor to use a private variable and avoid reassigning the parameters directly:

//  javascript
const Person = function(first, last) {
  // Private variables to store first and last names
  let firstName = first;
  let lastName = last;

  this.getFirstName = function() {
    return firstName;
  };

  this.getLastName = function() {
    return lastName;
  };

  this.getFullName = function() {
    return `${ firstName } ${ lastName } `;
  };

  this.setFirstName = function(newFirst) {
    firstName = newFirst;
  };

  this.setLastName = function(newLast) {
    lastName = newLast;
  };

  this.setFullName = function(newFirst, newLast) {
    firstName = newFirst;
    lastName = newLast;
  };
};

// Example usage
const person = new Person('Bob', 'Ross');
console.log(person.getFullName()); // Output: "Bob Ross"

person.setFirstName('John');
console.log(person.getFullName()); // Output: "John Ross"

person.setLastName('Doe');
console.log(person.getFullName()); // Output: "John Doe"

person.setFullName('Alice', 'Smith');
console.log(person.getFullName()); // Output: "Alice Smith"


// Now, the`Person` constructor uses private variables(`firstName` and`lastName`) to store the names, and the methods access and modify these private variables without directly reassigning the parameters.

////////////////////////////////////////////////

// Map the Debris
// According to Kepler's Third Law, the orbital period  T
//   of two point masses orbiting each other in a circular or elliptic orbit is:

// T = 2πa3μ−−−√

// a
//   is the orbit's semi-major axis
// μ = GM
//   is the standard gravitational parameter
// G
//   is the gravitational constant,
//   M
//   is the mass of the more massive body.
// Return a new array that transforms the elements' average altitude into their orbital periods (in seconds).

// The array will contain objects in the format { name: 'name', avgAlt: avgAlt }.

// The values should be rounded to the nearest whole number.The body being orbited is Earth.

// The radius of the earth is 6367.4447 kilometers, and the GM value of earth is 398600.4418 km3s - 2.








// To calculate the orbital period using Kepler's Third Law, you can use the following formula:

// \[T = 2\pi \sqrt{ \frac{ a^ 3}{ \mu }} \]

// Where:
// - \(T \) is the orbital period in seconds,
//   - \(\pi \) is the mathematical constant Pi(approximately 3.14159),
//     - \(a \) is the semi - major axis,
//       - \(\mu \) is the standard gravitational parameter, \(\mu = GM \),
// - \(G \) is the gravitational constant,
//   - \(M \) is the mass of the Earth.

//     Here's the implementation:

      ```javascript
function orbitalPeriod(arr) {
  const GM = 398600.4418;
  const earthRadius = 6367.4447;

  // Calculate the orbital period for each object in the array
  const result = arr.map(obj => {
    const semiMajorAxis = earthRadius + obj.avgAlt;
    const orbitalPeriod = Math.round(2 * Math.PI * Math.sqrt((semiMajorAxis ** 3) / GM));
    return { name: obj.name, orbitalPeriod };
  });

  return result;
}

// Example usage
const result = orbitalPeriod([{ name: "sputnik", avgAlt: 35873.5553 }]);
console.log(result);
```

// In this example, the`orbitalPeriod` function uses the `map` method to transform each object in the array by calculating its orbital period and rounding it to the nearest whole number.The result is an array of objects with the`name` and `orbitalPeriod` properties.

// ////////////////////////////////////////////////
// ### JavaScript String Object: Keys, Uses, and Properties

// #### ** Uses:**
//   1. ** String Manipulation:** Store and manipulate text data.
// 2. ** String Methods:** Provides built-in methods for searching, replacing, splitting, and transforming strings.
// 3. ** Template Literals:** Used for embedding variables and expressions within strings using backticks (\`\`).
// 4. **Type Conversion:** Converting other data types to strings using `String()` or `.toString()`.

// #### **String Object Properties:**
// - **`.length`**: Returns the length of the string.

// #### **Properties of `String.prototype` (i.e., `__proto__`):**
// 1. **`.constructor`**: Refers to the function that created the instance.
// 2. **`.length`**: Returns the length of the string (number of characters).
// 3. **`.anchor(name)`**: Creates an HTML anchor (` < a > `).
// 4. **`.big()`**: Creates a ` < big > ` HTML element.
// 5. **`.blink()`**: Creates a ` < blink > ` HTML element (obsolete).
// 6. **`.bold()`**: Creates a ` < b > ` HTML element.
// 7. **`.charAt(index)`**: Returns the character at the specified index.
// 8. **`.charCodeAt(index)`**: Returns the Unicode value of the character at the specified index.
// 9. **`.codePointAt(pos)`**: Returns the code point of a character.
// 10. **`.concat(...strings)`**: Concatenates two or more strings.
// 11. **`.endsWith(searchString[, length])`**: Checks if the string ends with a specific substring.
// 12. **`.includes(searchString[, position])`**: Checks if the string contains a specific substring.
// 13. **`.indexOf(searchValue[, fromIndex])`**: Returns the first index of the specified value.
// 14. **`.italics()`**: Creates an ` < i > ` HTML element.
// 15. **`.lastIndexOf(searchValue[, fromIndex])`**: Returns the last index of the specified value.
// 16. **`.localeCompare(compareString[, locales[, options]])`**: Compares two strings based on locale.
// 17. **`.match(regexp)`**: Matches a string against a regular expression.
// 18. **`.matchAll(regexp)`**: Returns an iterator of matches for a regular expression.
// 19. **`.normalize([form])`**: Returns a Unicode-normalized string.
// 20. **`.padEnd(targetLength[, padString])`**: Pads the string at the end.
// 21. **`.padStart(targetLength[, padString])`**: Pads the string at the start.
// 22. **`.repeat(count)`**: Repeats the string a specified number of times.
// 23. **`.replace(searchFor, replaceWith)`**: Replaces part of the string.
// 24. **`.replaceAll(searchFor, replaceWith)`**: Replaces all occurrences of a substring.
// 25. **`.search(regexp)`**: Searches for a match between a string and a regular expression.
// 26. **`.slice(startIndex[, endIndex])`**: Extracts a section of a string.
// 27. **`.small()`**: Creates a ` < small > ` HTML element.
// 28. **`.split([separator[, limit]])`**: Splits a string into an array.
// 29. **`.startsWith(searchString[, position])`**: Checks if the string starts with a specific substring.
// 30. **`.strike()`**: Creates a ` < strike > ` HTML element.
// 31. **`.sub()`**: Creates a ` < sub > ` HTML element.
// 32. **`.substr(start[, length])`**: Returns a portion of the string (deprecated).
// 33. **`.substring(startIndex[, endIndex])`**: Returns a portion of the string.
// 34. **`.sup()`**: Creates a ` < sup > ` HTML element.
// 35. **`.toLocaleLowerCase([locales])`**: Converts the string to lowercase using locale rules.
// 36. **`.toLocaleUpperCase([locales])`**: Converts the string to uppercase using locale rules.
// 37. **`.toLowerCase()`**: Converts the string to lowercase.
// 38. **`.toString()`**: Returns a string representation of the object.
// 39. **`.toUpperCase()`**: Converts the string to uppercase.
// 40. **`.trim()`**: Removes whitespace from both ends of the string.
// 41. **`.trimEnd()` / `.trimRight()`**: Trims whitespace from the end of the string.
// 42. **`.trimStart()` / `.trimLeft()`**: Trims whitespace from the start of the string.
// 43. **`.valueOf()`**: Returns the primitive value of the string object.

// These properties and methods allow comprehensive control and manipulation of string data in JavaScript.
// ////////////////////////////////////////////////
// Here’s a collection of various pattern problems implemented in JavaScript. I’ll cover the main categories like:

// 1. **Square Patterns**
// 2. **Triangle Patterns**
// 3. **Pyramid Patterns**
// 4. **Diamond Patterns**
// 5. **Number and Character Patterns**

// Each of these categories will include different variations.

// ### 1. **Square Patterns**

// #### 1.1. Full Square Pattern
```
*****
*****
*****
*****
*****
  ```

```javascript
function fullSquare(n) {
  for (let i = 0; i < n; i++) {
    console.log('* '.repeat(n));
  }
}

fullSquare(5);
```

// #### 1.2. Hollow Square Pattern
```
*****
*   *
*   *
*   *
*****
  ```

```javascript
function hollowSquare(n) {
  for (let i = 0; i < n; i++) {
    if (i === 0 || i === n - 1) {
      console.log('* '.repeat(n));
    } else {
      console.log('* ' + '  '.repeat(n - 2) + '* ');
    }
  }
}

hollowSquare(5);
```

// ### 2. **Triangle Patterns**

// #### 2.1. Left-Aligned Triangle
```
*
* *
* * *
* * * *
* * * * *
  ```

```javascript
function leftAlignedTriangle(n) {
  for (let i = 1; i <= n; i++) {
    console.log('* '.repeat(i));
  }
}

leftAlignedTriangle(5);
```

// #### 2.2. Right-Aligned Triangle
```
        *
      * *
    * * *
  * * * *
* * * * *
  ```

```javascript
function rightAlignedTriangle(n) {
  for (let i = 1; i <= n; i++) {
    console.log(' '.repeat(n - i) + '* '.repeat(i));
  }
}

rightAlignedTriangle(5);
```

// #### 2.3. Equilateral Triangle
```
     *
    * * 
   * * * 
  * * * * 
 * * * * *
  ```

```javascript
function equilateralTriangle(n) {
  for (let i = 1; i <= n; i++) {
    console.log(' '.repeat(n - i) + '* '.repeat(i));
  }
}

equilateralTriangle(5);
```

// ### 3. **Pyramid Patterns**

// #### 3.1. Simple Pyramid
```
    *
   * *
  * * *
 * * * *
* * * * *
  ```

```javascript
function pyramidPattern(n) {
  for (let i = 1; i <= n; i++) {
    console.log(' '.repeat(n - i) + '* '.repeat(i));
  }
}

pyramidPattern(5);
```

// #### 3.2. Inverted Pyramid
```
* * * * *
 * * * *
  * * *
   * *
    *
  ```

```javascript
function invertedPyramid(n) {
  for (let i = n; i >= 1; i--) {
    console.log(' '.repeat(n - i) + '* '.repeat(i));
  }
}

invertedPyramid(5);
```

// ### 4. **Diamond Patterns**

// #### 4.1. Simple Diamond
```
    *
   * *
  * * *
 * * * *
* * * * *
 * * * *
  * * *
   * *
    *
  ```

```javascript
function diamondPattern(n) {
  for (let i = 1; i <= n; i++) {
    console.log(' '.repeat(n - i) + '* '.repeat(i));
  }
  for (let i = n - 1; i >= 1; i--) {
    console.log(' '.repeat(n - i) + '* '.repeat(i));
  }
}

diamondPattern(5);
```

// #### 4.2. Hollow Diamond
```
    *
   * *
  *   *
 *     *
*       *
 *     *
  *   *
   * *
    *
  ```

```javascript
function hollowDiamond(n) {
  for (let i = 1; i <= n; i++) {
    if (i === 1) {
      console.log(' '.repeat(n - i) + '*');
    } else {
      console.log(' '.repeat(n - i) + '*' + ' '.repeat(2 * (i - 1) - 1) + '*');
    }
  }
  for (let i = n - 1; i >= 1; i--) {
    if (i === 1) {
      console.log(' '.repeat(n - i) + '*');
    } else {
      console.log(' '.repeat(n - i) + '*' + ' '.repeat(2 * (i - 1) - 1) + '*');
    }
  }
}

hollowDiamond(5);
```

// ### 5. **Number Patterns**

// #### 5.1. Increasing Numbers Triangle
```
1
1 2
1 2 3
1 2 3 4
1 2 3 4 5
  ```

```javascript
function increasingNumbersTriangle(n) {
  for (let i = 1; i <= n; i++) {
    let row = '';
    for (let j = 1; j <= i; j++) {
      row += j + ' ';
    }
    console.log(row);
  }
}

increasingNumbersTriangle(5);
```

// #### 5.2. Number Pyramid
```
1
1 2
1 2 3
1 2 3 4
1 2 3 4 5
  ```

```javascript
function numberPyramid(n) {
  for (let i = 1; i <= n; i++) {
    let row = ' '.repeat(n - i);
    for (let j = 1; j <= i; j++) {
      row += j + ' ';
    }
    console.log(row);
  }
}

numberPyramid(5);
```

// ### 6. **Character Patterns**

// #### 6.1. Alphabet Triangle
```
A
A B
A B C
A B C D
A B C D E
  ```

```javascript
function alphabetTriangle(n) {
  for (let i = 1; i <= n; i++) {
    let row = '';
    for (let j = 0; j < i; j++) {
      row += String.fromCharCode(65 + j) + ' ';
    }
    console.log(row);
  }
}

alphabetTriangle(5);
```

// These are some of the most common pattern problems in JavaScript. You can mix and match or modify these based on your needs.
////////////////////////////////////////////////  L

function stringToObject(path, value) {
  const keys = path.split('.');  // Split the string by '.'
  let result = {};               // Initialize an empty object
  let current = result;          // Reference to the current level of nesting

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = value;      // If it's the last key, assign the value
    } else {
      current[key] = {};         // Otherwise, create a new object
      current = current[key];    // Move deeper into the object
    }
  });
  
  return result;                 // Return the final nested object
}

// Example usage:
console.log(stringToObject("a.b.c", "Hello"));
// ➞ { a: { b: { c: "Hello" } } }

////////////////////////////////////////////////
// **Fetch vs Axios**:

// 1. **Fetch**:
//    - Built-in browser API for making HTTP requests.
//    - Returns a **promise** and requires manual handling of response parsing (e.g., `.json()`).
//    - Does not automatically handle errors for non-200 responses.
//    - Requires more setup for request configurations like timeouts, interceptors, or retries.

// 2. **Axios**:
//    - Third-party library for HTTP requests.
//    - Automatically transforms response data (e.g., JSON).
//    - **Error handling** is simpler, as non-2xx responses trigger catch blocks.
//    - Supports features like request **timeouts**, **interceptors**, and built-in **cancellation** of requests.
//    - Works in both browsers and Node.js.

// **Summary**:  
// - Use **Fetch** if you need a lightweight, native API for basic requests.
// - Use **Axios** if you want more advanced features like automatic parsing, error handling, and interceptors.
// ////////////////////////////////////////////////
// To maintain different personas in a React.js application, you can structure your app to handle different user types (e.g., Admin, Guest, User) by controlling access and rendering different components based on user roles or personas. Here’s how you can manage it:

// ### 1. **Context API / Global State Management (Redux)**:
//    - Use the **Context API** or **Redux** to store the current user's role or persona (Admin, Guest, etc.).
//    - Based on the role, render different components or views.

// ### Example with Context API:
```jsx
// Context.js
import { createContext, useContext, useState } from 'react';

const UserContext = createContext();

export const useUserContext = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [persona, setPersona] = useState('Guest'); // Default persona

  return (
    <UserContext.Provider value={{ persona, setPersona }}>
      {children}
    </UserContext.Provider>
  );
};
```

// ### 2. **Conditional Rendering**:
//    - Based on the persona from context, conditionally render the corresponding components.

```jsx
// App.js
import React from 'react';
import { useUserContext } from './Context';
import AdminDashboard from './AdminDashboard';
import GuestView from './GuestView';
import UserDashboard from './UserDashboard';

const App = () => {
  const { persona } = useUserContext();

  return (
    <div>
      {persona === 'Admin' && <AdminDashboard />}
      {persona === 'User' && <UserDashboard />}
      {persona === 'Guest' && <GuestView />}
    </div>
  );
};
```

// ### 3. **Role-based Routing**:
//    - With **React Router**, you can set up role-based routes to restrict or grant access to certain pages depending on the user persona.

```jsx
// App.js
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useUserContext } from './Context';

const PrivateRoute = ({ component: Component, ...rest }) => {
  const { persona } = useUserContext();

  return persona === 'Admin' ? <Component {...rest} /> : <Navigate to="/guest" />;
};

const App = () => (
  <Router>
    <Routes>
      <Route path="/admin" element={<PrivateRoute component={AdminDashboard} />} />
      <Route path="/guest" element={<GuestView />} />
      <Route path="/user" element={<UserDashboard />} />
    </Routes>
  </Router>
);
```

// ### 4. **Changing Persona**:
//    - Provide functionality for the user to switch personas dynamically (useful for testing or certain applications).

```jsx
const PersonaSwitcher = () => {
  const { persona, setPersona } = useUserContext();

  return (
    <div>
      <p>Current Persona: {persona}</p>
      <button onClick={() => setPersona('Admin')}>Switch to Admin</button>
      <button onClick={() => setPersona('User')}>Switch to User</button>
      <button onClick={() => setPersona('Guest')}>Switch to Guest</button>
    </div>
  );
};
```

### Conclusion:
By using context or global state for persona management, conditional rendering, and role-based routing, you can efficiently handle multiple personas in your React app.
////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////


/////////////////////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////

