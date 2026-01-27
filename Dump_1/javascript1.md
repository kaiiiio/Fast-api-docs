# JavaScript Master Reference: Patterns, Logic & DSA

This guide is a comprehensive collection of JavaScript patterns, data structure operations, and logical problem-solving techniques.

## Table of Contents
1. [Objects & Data Transformations](#objects--data-transformations)
2. [Array CRUD & Manipulation](#array-crud--manipulation)
3. [String Processing](#string-processing)
4. [Data Types & Memory](#data-types--memory)
5. [Sorting & Algorithmic Logic](#sorting--algorithmic-logic)

---

## Objects & Data Transformations

### Finding Common Key-Value Pairs
Compare two objects and extract pairs that exist and match in both.

```javascript
const input1 = { a: 1, b: 2, c: 3, d: 10, e: 12 };
const input2 = { a: 2, e: 12, f: 6, d: 10 };

// Using Object.keys and forEach
let output = {};
Object.keys(input1).forEach((item) => {
  if (input2[item] === input1[item]) {
    output[item] = input1[item];
  }
});
console.log("Common Pairs:", output); // { d: 10, e: 12 }

// Using for...in loop
function getCommonPairs(obj1, obj2) {
  let result = {};
  for (let key in obj1) {
    if (obj1[key] === obj2[key]) {
      result[key] = obj2[key];
    }
  }
  return result;
}
```

---

## Array CRUD & Manipulation

### basic Operations on Array of Objects
How to perform insertion, update, deletion, filtering, and searching.

```javascript
let data = [
  { id: 1, name: 'Alice', age: 25 },
  { id: 2, name: 'Bob', age: 30 },
  { id: 3, name: 'Charlie', age: 28 },
];

// 1. Insertion / Addition
const newItem = { id: 4, name: 'David', age: 22 };
data.push(newItem);

const addNewItem = (item) => {
  data = [...data, item];
};

// 2. Update
const updateItem = (id, updatedFields) => {
  data = data.map((item) => {
    if (item.id === id) {
      return { ...item, ...updatedFields };
    }
    return item;
  });
};

// Update by Index
const index = data.findIndex(item => item.id === 2);
if (index !== -1) {
  data[index].age = 35;
}

// 3. Deletion
const deleteItem = (id) => {
  data = data.filter((item) => item.id !== id);
};

// 4. Filtering
const filteredData = data.filter((item) => item.age > 25);

// 5. Searching
const searchByName = (searchTerm) => {
  return data.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
};
```

---

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

## String Processing

### Replacing Occurrences
Example of finding and replacing specific occurrences of a substring.

```javascript
var inputString = "Good morning good afternoon good morning good night";

// Find the first occurrence
var firstOccurrence = inputString.indexOf("good morning");

if (firstOccurrence !== -1) {
  // Find the second occurrence starting after the first
  var secondOccurrence = inputString.indexOf("good morning", firstOccurrence + 1);

  if (secondOccurrence !== -1) {
    // Replace the second occurrence with "good bye"
    var modifiedString =
      inputString.slice(0, secondOccurrence) +
      "good bye" +
      inputString.slice(secondOccurrence + 12); // 12 is length of "good morning"

    console.log(modifiedString);
  }
}
```

---

## Data Types & Memory

### Primitive vs. Non-Primitive Types

| Feature | Primitive Types | Non-Primitive (Reference) Types |
|---------|-----------------|---------------------------------|
| **Mutability** | Immutable (cannot be changed) | Mutable (can be changed) |
| **Storage** | Directly in memory (Stack) | By reference (Heap) |
| **Values** | `number`, `string`, `boolean`, `null`, `undefined`, `symbol` | `object`, `array`, `function`, `Date` |
| **Assignment** | Stores actual value | Stores memory address |

> [!NOTE]
> Understanding these distinctions is crucial for effective JavaScript programming and memory management.

---

## Sorting & Algorithmic Logic

### Finding the Second Largest Number

```javascript
const input = [1, 4, 7, 2, 4, 7, 6, 6];

// Method 1: Set and Sort
function secondLargestSet(input) {
  let arr = [...new Set(input)].sort((a, b) => a - b);
  return arr[arr.length - 2];
}

// Method 2: Single Pass Logic
function secondLargestLogic(array) {
  let max = array[0];
  let secondMax = array[0];
  for (let i = 1; i < array.length; i++) {
    if (array[i] > max) {
      secondMax = max;
      max = array[i];
    } else if (array[i] > secondMax && array[i] !== max) {
      secondMax = array[i];
    }
  }
  return secondMax;
}
```

### Sorting Algorithms

#### Bubble Sort
Time Complexity: $O(n^2)$

```javascript
function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]; // ES6 Swap
      }
    }
  }
  return arr;
}
```

---
### Array Rotations & Missing Numbers

#### Finding Missing Odd Numbers in a Range
Example of identifying missing digits in an arithmetic progression.

```javascript
const input3 = [5, 7, 9, 11, 15, 17, 21, 25];
let start = input3[0];
let end = input3.at(-1);
let missing = [];

for (let i = start; i <= end; i++) {
  if (i % 2 !== 0 && !input3.includes(i)) {
    missing.push(i);
  }
}
console.log("Missing Odds:", missing); // [ 13, 19, 23 ]
```

---

### Advanced String Manipulation

#### Reverse Word by Word
```javascript
let str = "This is JavaScript Code";
let reversedWords = str
  .split(" ")
  .map((word) => word.split("").reverse().join(""))
  .join(" ");
console.log(reversedWords); // "sihT si tpircSavaJ edoC"
```

#### Finding Max Occurring Character
```javascript
const str2 = "This is Javascript Code and you have to find max char";

const charFrequency = str2.split("").reduce((acc, curr) => {
  if (curr !== " ") {
    let char = curr.toLowerCase();
    acc[char] = (acc[char] || 0) + 1;
  }
  return acc;
}, {});

const sortedFreq = Object.entries(charFrequency).sort((a, b) => b[1] - a[1]);
console.log("Max occurring char:", sortedFreq[0]);
```

---

### Basic Array & String Exercises

#### Sum of all Integers
```javascript
function sumArray(array) {
  return array.reduce((acc, curr) => acc + curr, 0);
}
```

#### Find Largest Integer
```javascript
function maxArray(array) {
  return Math.max(...array);
}
```

#### Reverse a String
```javascript
function reverseString(str) {
  return str.split("").reverse().join("");
}
```

#### Filter Even Integers
```javascript
const filterEven = (arr) => arr.filter(num => num % 2 === 0);
```

#### Get Vowels only
```javascript
function getVowels(str) {
  const vowels = "aeiouAEIOU";
  return str.split("").filter(char => vowels.includes(char)).join("");
}
```

---
// ------------------------------------------------------------------------------
### Classical Algorithms & Logic

#### Finding Second Smallest
```javascript
function findSecondSmallest(arr) {
  let smallest = Infinity;
  let secondSmallest = Infinity;

  for (let num of arr) {
    if (num < smallest) {
      secondSmallest = smallest;
      smallest = num;
    } else if (num < secondSmallest && num !== smallest) {
      secondSmallest = num;
    }
  }
  return secondSmallest;
}
```

#### Palindrome Check
```javascript
function isPalindrome(str) {
  const cleanStr = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleanStr === cleanStr.split("").reverse().join("");
}
```

#### Binary Search (O(log n))
```javascript
function binarySearch(array, target) {
  let left = 0;
  let right = array.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (array[mid] === target) return mid;
    (array[mid] < target) ? (left = mid + 1) : (right = mid - 1);
  }
  return -1;
}
```

---
### Frequency & Math Problems

#### Character Frequency Count
```javascript
function countCharacters(str) {
  const count = {};
  for (let char of str) {
    count[char] = (count[char] || 0) + 1;
  }
  return count;
}
```

#### Factorial (Recursion)
```javascript
function factorial(num) {
  if (num <= 1) return 1;
  return num * factorial(num - 1);
}
```

#### Quicksort (O(n log n))
```javascript
function quicksort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[0];
  const left = arr.slice(1).filter(el => el < pivot);
  const right = arr.slice(1).filter(el => el >= pivot);
  return [...quicksort(left), pivot, ...quicksort(right)];
}
```

---
### Array Transformation & Search

#### Largest Product of Two Numbers
```javascript
function largestProduct(arr) {
  const sorted = [...arr].sort((a, b) => b - a);
  return sorted[0] * sorted[1];
}
```

#### Maximum Subarray Sum (Kadane's Algorithm)
```javascript
function maximumSubarraySum(arr) {
  let maxSum = arr[0];
  let currentSum = arr[0];
  for (let i = 1; i < arr.length; i++) {
    currentSum = Math.max(arr[i], currentSum + arr[i]);
    maxSum = Math.max(maxSum, currentSum);
  }
  return maxSum;
}
```

#### Finding Duplicates
```javascript
function findDuplicates(arr) {
  const freq = {};
  return arr.filter(item => {
    freq[item] = (freq[item] || 0) + 1;
    return freq[item] === 2;
  });
}
```

---

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

## Intermediate Array & Functional Patterns

### Flattening & Mapping (flatMap)
`flatMap()` first maps each element using a mapping function, then flattens the result into a new array.

```javascript
// Example: Combinations
const fruits = ["apple", "banana"];
const colors = ["red", "yellow"];
const combinations = fruits.flatMap(fruit => 
  colors.map(color => `${color} ${fruit}`)
);
// ["red apple", "yellow apple", "red banana", "yellow banana"]
```

---

### Filtering Data

#### Filter with multiple criteria
```javascript
const products = [
  { name: "Apple", category: "Fruit", price: 1.5 },
  { name: "Orange", category: "Fruit", price: 2.2 },
  { name: "Banana", category: "Fruit", price: 0.5 },
];

const cheapFruits = products.filter(p => 
  p.category === "Fruit" && p.price < 2.0
);
```

#### Prime Number Filter
```javascript
const isPrime = num => {
  for(let i = 2, s = Math.sqrt(num); i <= s; i++)
    if(num % i === 0) return false; 
  return num > 1;
};
const primes = [1, 2, 3, 4, 5].filter(isPrime);
```

---

### Reduce & Accumulation

#### Grouping Objects
```javascript
const products = [
  { name: "Apple", category: "Fruit" },
  { name: "Carrot", category: "Vegetable" },
  { name: "Orange", category: "Fruit" },
];

const grouped = products.reduce((acc, curr) => {
  (acc[curr.category] = acc[curr.category] || []).push(curr);
  return acc;
}, {});
```

#### Frequent Element Check
```javascript
const items = [1, 2, 2, 3, 2];
const freq = items.reduce((acc, curr) => {
  acc[curr] = (acc[curr] || 0) + 1;
  return acc;
}, {});
```

---
// ---------------------------------------------------------------------------------
### Array Search & Predicates

#### Every & Some
- `every()`: Returns true if ALL elements pass the test.
- `some()`: Returns true if AT LEAST ONE element passes the test.

```javascript
const numbers = [10, 20, 30];
const allOver18 = numbers.every(n => n > 18); // false
const someOver18 = numbers.some(n => n > 18);  // true
```

#### Find & findIndex
- `find()`: Returns the first element that satisfies the condition.
- `findIndex()`: Returns the index of that element.

```javascript
const users = [{id: 1, name: "Alice"}, {id: 2, name: "Bob"}];
const user = users.find(u => u.id === 2); // {id: 2, name: "Bob"}
```

---

// ----------------------------------Array.from()
### Array Utilities & Conversion

#### Array.from()
Converts iterables or array-like objects into arrays.

```javascript
// From String
Array.from("ABC"); // ['A', 'B', 'C']

// Generating Range
const range = (n) => Array.from({length: n}, (_, i) => i + 1);
```

#### Spread Operator (...)
Merges, clones, and converts arguments.

```javascript
const combined = [...arr1, ...arr2];
const copy = [...original];
const max = Math.max(...[1, 5, 2]); // Using spread with Math.max
```

---

// ---------------------------------------------------------------------------------
## Math & Control Flow

### Math Methods
```javascript
Math.PI;      // 3.14159...
Math.sqrt(16); // 4
Math.abs(-5);  // 5
Math.floor(3.9); // 3 (Round down)
Math.ceil(3.1);  // 4 (Round up)
Math.trunc(3.9); // 3 (Remove decimals)
Math.random();   // 0 to 1
```

### Logical Operators & Conditionals
- `??` (Nullish Coalescing): Returns first arg if not `null`/`undefined`.
- `||` (Short-circuit): Returns first truthy value.

#### Chained Ternary
```javascript
const result = num > 0 ? "Positive" : num < 0 ? "Negative" : "Zero";
```

#### Switch Statement (Fall-through)
```javascript
switch (grade) {
  case "A":
  case "B":
    message = "Pass";
    break;
  default:
    message = "Fail";
}
```

---
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
## Loops & Iteration

### Standard Loops
#### The `for` Loop
```javascript
const numbers = [1, 2, 3, 4, 5];
for (let i = 0; i < numbers.length; i++) {
  console.log(numbers[i]);
}
```

#### The `while` Loop
```javascript
let countdown = 10;
while (countdown >= 0) {
  console.log(countdown--);
}
```

#### The `do...while` Loop
```javascript
let i = 1, factorial = 1;
do {
  factorial *= i++;
} while (i <= 5);
```

---

### Object & Collection Iteration

#### `for...in` (Iterating Keys)
Used for object properties or array indices.
```javascript
const person = { name: "John", age: 30 };
for (let key in person) {
  console.log(`${key}: ${person[key]}`);
}
```

#### `for...of` (Iterating Values)
Used for iterable objects (Arrays, Strings, Maps, Sets).
```javascript
const students = [{name: "John"}, {name: "Jane"}];
for (let student of students) {
  console.log(student.name);
}
```

#### `Array.forEach()`
```javascript
const numbers = [2, 4, 6];
numbers.forEach((num) => console.log(num * 2));
```

---

### Collections: Sets & Iterables

#### Creating and Using Sets
Sets store unique values of any type.

```javascript
const mySet = new Set([1, 2, 3, 3]); // {1, 2, 3}
mySet.add(4);
mySet.has(2); // true
mySet.delete(1);
```

#### Custom Iterables
```javascript
const myIterable = {
  [Symbol.iterator]() {
    let count = 1;
    return {
      next: () => count <= 5 
        ? { value: count++, done: false } 
        : { done: true }
    };
  }
};
```

---
 // Adding a duplicate element, which will be ignored
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

## Data Types & Classes

### Type checking and Nan
```javascript
typeof NaN; // "number"
Array.isArray([]); // true
typeof null; // "object"
```

### Classes & Constructors
```javascript
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
  sayHello() {
    console.log(`Hello, I'm ${this.name}`);
  }
}
```

### Inheritance & instanceof
```javascript
class Square extends Rectangle {
  constructor(side) {
    super(side, side);
  }
}
const sq = new Square(5);
console.log(sq instanceof Rectangle); // true
```

---

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
## Prototype Inheritance

### Prototypes & Chain
All JavaScript objects inherit properties and methods from a prototype. `Object.prototype` is at the top of the chain.

```javascript
function Animal(name) {
  this.name = name;
}
Animal.prototype.sound = function() {
  console.log("Animal makes sound");
};

function Dog(name) {
  Animal.call(this, name); // Super call
}
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;
```

---

## Error Handling

### Try, Catch, Finally
```javascript
try {
  // Dangerous code
} catch (error) {
  console.error("Caught:", error);
} finally {
  console.log("Cleanup always runs");
}
```

---

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

## Functions: Rest, Closures & Context

### Rest Parameters (...)
```javascript
function sum(...numbers) {
  return numbers.reduce((acc, n) => acc + n, 0);
}
```

### Closures
```javascript
function createCounter() {
  let count = 0;
  return () => ++count;
}
const count = createCounter();
count(); // 1
```

### Callbacks
```javascript
function fetchData(callback) {
  setTimeout(() => callback("Success"), 1000);
}
```

---

## Asynchronous JavaScript

### Promises
```javascript
const myPromise = new Promise((resolve, reject) => {
  setTimeout(() => resolve("Data"), 2000);
});

myPromise.then(data => console.log(data));
```

#### Promise.all
Waits for all promises to resolve.
```javascript
Promise.all([p1, p2]).then(results => {
  // results is an array of responses
});
```

---

// ------------------------------------------------------------Server side validation is performed by a web server, after input has been sent to the server. Client side validation is performed by a web browser, before input is sent to a web server.





//////////////////////////////////////////////// L

## Performance & Time Complexity

### Arrays
- **Access (index)**: $O(1)$
- **Insert/Delete (end)**: $O(1)$
- **Insert/Delete (start/middle)**: $O(n)$
- **Linear Search**: $O(n)$
- **Binary Search**: $O(\log n)$ (Sorted only)

### Objects (Hash Maps)
- **Insert/Delete/Search**: $O(1)$ (Average case)

---
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
#### Arithmetic Sum & Diff
```javascript
// Sum all numbers in a range
function sumAll(arr) {
  const [min, max] = [Math.min(...arr), Math.max(...arr)];
  return ((max - min + 1) * (min + max)) / 2;
}

// Symmetric Difference
function diffArray(arr1, arr2) {
  return [...arr1, ...arr2].filter(i => !arr1.includes(i) || !arr2.includes(i));
}
```

#### Multi-Value Filtering
```javascript
// Destroyer: Remove values in args from arr
function destroyer(arr, ...args) {
  return arr.filter(item => !args.includes(item));
}
```

---


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
## Coding Challenges & Problem Solving

#### Spinal Case Conversion
Convert string to lowercase, joined by dashes.

```javascript
function spinalCase(str) {
  return str
    .split(/\s|_|(?=[A-Z])/)
    .join("-")
    .toLowerCase();
}
```

#### Pig Latin Translator
```javascript
function translatePigLatin(str) {
  if (/^[aeiou]/.test(str)) return str + "way";
  const cluster = str.match(/^[^aeiou]+/)[0];
  return str.substring(cluster.length) + cluster + "ay";
}
```

#### Search and Replace (Case Preserved)
```javascript
function myReplace(str, before, after) {
  if (/^[A-Z]/.test(before)) {
    after = after[0].toUpperCase() + after.substring(1);
  } else {
    after = after[0].toLowerCase() + after.substring(1);
  }
  return str.replace(before, after);
}
```

---

#### Collections & HTML
```javascript
// DNA Pairing
function pairElement(str) {
  const pairs = { A: "T", T: "A", C: "G", G: "C" };
  return str.split("").map(c => [c, pairs[c]]);
}

// Missing Letter
function fearNotLetter(str) {
  for (let i = 0; i < str.length - 1; i++) {
    if (str.charCodeAt(i + 1) - str.charCodeAt(i) > 1) {
      return String.fromCharCode(str.charCodeAt(i) + 1);
    }
  }
}

// Sorted Union (Unique values in order)
function uniteUnique(...arrays) {
  return [...new Set(arrays.flat())];
}

// HTML Entity Converter
function convertHTML(str) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
  return str.replace(/[&<>"']/g, m => entities[m]);
}
```

---

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
#### Advanced Algorithms
```javascript
// Sum All Primes
function sumPrimes(num) {
  let sum = 0;
  for (let i = 2; i <= num; i++) {
    if (isPrime(i)) sum += i;
  }
  return sum;
}

// Smallest Common Multiple
function smallestCommons(arr) {
  const [min, max] = arr.sort((a,b) => a-b);
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const lcm = (a, b) => (a * b) / gcd(a, b);
  let res = min;
  for(let i = min + 1; i <= max; i++) res = lcm(res, i);
  return res;
}

// Steamroller (Flatten Recursive)
function steamrollArray(arr) {
  return arr.reduce((acc, val) => 
    acc.concat(Array.isArray(val) ? steamrollArray(val) : val), []);
}
```

---


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

  #### Physics & Utility
```javascript
// Map the Debris (Kepler's Third Law)
function orbitalPeriod(arr) {
  const GM = 398600.4418, earthRadius = 6367.4447;
  return arr.map(({ name, avgAlt }) => {
    const period = Math.round(2 * Math.PI * 
                   Math.sqrt(Math.pow(earthRadius + avgAlt, 3) / GM));
    return { name, orbitalPeriod: period };
  });
}

// Arguments Optional (Currying)
function addTogether() {
  const [a, b] = arguments;
  if (typeof a !== 'number') return undefined;
  if (arguments.length === 2) return typeof b === 'number' ? a + b : undefined;
  return (c) => typeof c === 'number' ? a + c : undefined;
}
```

---

// ////////////////////////////////////////////////
// ### JavaScript String Object: Keys, Uses, and Properties

// #### ** Uses:**
//   1. ** String Manipulation:** Store and manipulate text data.
// 2. ** String Methods:** Provides built-in methods for searching, replacing, splitting, and transforming strings.
// 3. ** Template Literals:** Used for embedding variables and expressions within strings using backticks (\`\`).
// 4. **Type Conversion:** Converting other data types to strings using `String()` or `.toString()`.

## String Reference (Methods & Properties)

| Method | Description |
|:-------|:------------|
| `.charAt(i)` | Character at index `i` |
| `.charCodeAt(i)` | UTF-16 code at index `i` |
| `.includes(sub)` | Check if string contains `sub` |
| `.indexOf(v)` | First index of value `v` |
| `.replace(f, r)` | Replace first occurrence of `f` with `r` |
| `.replaceAll(f, r)` | Replace all occurrences (Requires global regex or string) |
| `.slice(s, e)` | Extract from `s` to `e` |
| `.split(sep)` | Convert to array by `sep` |
| `.toLowerCase()` | Convert to lowercase |
| `.toUpperCase()` | Convert to uppercase |
| `.trim()` | Remove edge whitespace |

---
## Interview Logic: Star Patterns

### Square Patterns
```javascript
function fullSquare(n) {
  for (let i = 0; i < n; i++) console.log('* '.repeat(n));
}
```

### Triangles
```javascript
function leftTriangle(n) {
  for (let i = 1; i <= n; i++) console.log('* '.repeat(i));
}

function pyramid(n) {
  for (let i = 1; i <= n; i++) {
    console.log(' '.repeat(n - i) + '* '.repeat(i));
  }
}
```

---

### Hollow Diamond
```javascript
function hollowDiamond(n) {
  for (let i = 1; i <= n; i++) {
    if (i === 1) console.log(' '.repeat(n - i) + '*');
    else console.log(' '.repeat(n - i) + '*' + ' '.repeat(2 * (i - 1) - 1) + '*');
  }
}
```

### Number Pyramid
```javascript
function numberPyramid(n) {
  for (let i = 1; i <= n; i++) {
    let row = ' '.repeat(n - i);
    for (let j = 1; j <= i; j++) row += j + ' ';
    console.log(row);
  }
}
```

---
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
## Full Stack & Utility Patterns

### Fetch vs Axios
- **Fetch**: Native API, returns promise, requires manual `.json()` parsing, no automatic error handling for non-2xx status codes.
- **Axios**: Library, automatic transformations, simpler error handling, supports interceptors and request cancellation.

### React Persona Management
Manage Admin vs User views using Context API.
```jsx
const UserProvider = ({ children }) => {
  const [persona, setPersona] = useState('Guest');
  return (
    <UserContext.Provider value={{ persona, setPersona }}>
      {children}
    </UserContext.Provider>
  );
};
```
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



