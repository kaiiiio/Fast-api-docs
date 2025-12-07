// ========== OUTPUT-BASED TOUGH JAVASCRIPT QUESTIONS ==========
// Comprehensive questions covering: Generators, Iterators, TDZ, Hoisting, Closures, 
// Async/Await, Promises, Event Loop, Call Stack, Memory Management, Garbage Collection,
// Arrays, Objects, Functions, Classes, Modules

// ===================================================================
// SECTION 1: HOISTING & TEMPORAL DEAD ZONE (TDZ)
// ===================================================================

// Question 1: Variable Hoisting with var, let, const
console.log("=== Question 1: Variable Hoisting ===");
function hoistingTest1() {
  console.log(a); // What is the output?
  console.log(b); // What is the output?
  console.log(c); // What is the output?
  
  var a = 10;
  let b = 20;
  const c = 30;
}

// Answer: 
// undefined (var is hoisted and initialized with undefined)
// ReferenceError: Cannot access 'b' before initialization (let is in TDZ)
// ReferenceError: Cannot access 'c' before initialization (const is in TDZ)

// Question 2: Function Hoisting vs Variable Hoisting
console.log("=== Question 2: Function vs Variable Hoisting ===");
function hoistingTest2() {
  console.log(typeof myFunc); // What is the output?
  console.log(typeof myVar); // What is the output?
  
  function myFunc() {
    return "function";
  }
  
  var myVar = function() {
    return "variable";
  };
}

// Answer:
// "function" (function declarations are fully hoisted)
// "undefined" (var is hoisted but initialized with undefined)

// Question 3: TDZ with let and const
console.log("=== Question 3: Temporal Dead Zone ===");
function tdzTest1() {
  console.log(x); // What is the output?
  let x = 10;
}

// Answer:
// ReferenceError: Cannot access 'x' before initialization

// Question 4: TDZ with block scope
console.log("=== Question 4: TDZ in Block Scope ===");
function tdzTest2() {
  let x = 10;
  
  if (true) {
    console.log(x); // What is the output?
    let x = 20;
  }
}

// Answer:
// ReferenceError: Cannot access 'x' before initialization
// (The inner 'x' shadows the outer 'x', creating a TDZ in the block)

// Question 5: Class Hoisting
console.log("=== Question 5: Class Hoisting ===");
function classHoistingTest() {
  console.log(typeof MyClass); // What is the output?
  console.log(MyClass); // What is the output?
  
  class MyClass {
    constructor() {
      this.value = 42;
    }
  }
}

// Answer:
// "undefined" (classes are NOT hoisted, they are in TDZ until declaration)

// ===================================================================
// SECTION 2: CLOSURES
// ===================================================================

// Question 6: Basic Closure
console.log("=== Question 6: Basic Closure ===");
function closureTest1() {
  let count = 0;
  
  function increment() {
    count++;
    return count;
  }
  
  return increment;
}

const counter1 = closureTest1();
const counter2 = closureTest1();

console.log(counter1()); // What is the output?
console.log(counter1()); // What is the output?
console.log(counter2()); // What is the output?
console.log(counter1()); // What is the output?

// Answer:
// 1 (each closure has its own independent 'count' variable)
// 2
// 1 (counter2 has a separate closure)
// 3

// Question 7: Closure with Loop (Classic Problem)
console.log("=== Question 7: Closure in Loop ===");
function closureLoopTest1() {
  for (var i = 0; i < 3; i++) {
    setTimeout(function() {
      console.log(i); // What is the output?
    }, 100);
  }
}

// Answer:
// 3 (printed 3 times)
// (var has function scope, so all closures share the same 'i' after loop ends)

// Question 8: Closure with let in Loop
console.log("=== Question 8: Closure with let in Loop ===");
function closureLoopTest2() {
  for (let i = 0; i < 3; i++) {
    setTimeout(function() {
      console.log(i); // What is the output?
    }, 100);
  }
}

// Answer:
// 0, 1, 2 (each iteration creates a new block scope with its own 'i')

// Question 9: Closure with IIFE
console.log("=== Question 9: Closure with IIFE ===");
function closureIIFETest() {
  for (var i = 0; i < 3; i++) {
    (function(j) {
      setTimeout(function() {
        console.log(j); // What is the output?
      }, 100);
    })(i);
  }
}

// Answer:
// 0, 1, 2 (IIFE creates a new scope for each iteration, capturing 'j')

// Question 10: Closure with Module Pattern
console.log("=== Question 10: Module Pattern Closure ===");
function createModule() {
  let privateVar = 0;
  
  return {
    getValue: function() {
      return privateVar;
    },
    increment: function() {
      privateVar++;
    },
    setValue: function(val) {
      privateVar = val;
    }
  };
}

const module1 = createModule();
const module2 = createModule();

module1.increment();
module1.increment();
module2.increment();

console.log(module1.getValue()); // What is the output?
console.log(module2.getValue()); // What is the output?

// Answer:
// 2 (module1 has its own closure)
// 1 (module2 has a separate closure)

// ===================================================================
// SECTION 3: PROMISES & ASYNC/AWAIT
// ===================================================================

// Question 11: Promise Execution Order
console.log("=== Question 11: Promise Execution Order ===");
async function promiseOrderTest1() {
  console.log(1);
  
  Promise.resolve().then(() => console.log(2));
  
  console.log(3);
  
  await Promise.resolve();
  
  console.log(4);
}

promiseOrderTest1();
console.log(5);

// Answer:
// 1 (synchronous code)
// 3 (synchronous code)
// 5 (synchronous code in main thread)
// 2 (microtask from Promise.resolve().then)
// 4 (after await, continues in microtask queue)

// Question 12: Promise Chaining
console.log("=== Question 12: Promise Chaining ===");
Promise.resolve(1)
  .then(val => {
    console.log(val); // What is the output?
    return val + 1;
  })
  .then(val => {
    console.log(val); // What is the output?
    return Promise.resolve(val + 1);
  })
  .then(val => {
    console.log(val); // What is the output?
    return val + 1;
  });

// Answer:
// 1
// 2
// 3

// Question 13: Promise Error Handling
console.log("=== Question 13: Promise Error Handling ===");
Promise.reject("Error 1")
  .catch(err => {
    console.log(err); // What is the output?
    return "Recovered";
  })
  .then(val => {
    console.log(val); // What is the output?
    throw "Error 2";
  })
  .catch(err => {
    console.log(err); // What is the output?
  });

// Answer:
// "Error 1"
// "Recovered"
// "Error 2"

// Question 14: Promise.all vs Promise.allSettled
console.log("=== Question 14: Promise.all Failure ===");
Promise.all([
  Promise.resolve(1),
  Promise.reject("Error"),
  Promise.resolve(3)
])
  .then(values => {
    console.log(values); // Will this execute?
  })
  .catch(error => {
    console.log(error); // What is the output?
  });

// Answer:
// "Error" (Promise.all fails fast on first rejection)

// Question 15: Promise.allSettled
console.log("=== Question 15: Promise.allSettled ===");
Promise.allSettled([
  Promise.resolve(1),
  Promise.reject("Error"),
  Promise.resolve(3)
])
  .then(results => {
    console.log(results); // What is the output?
  });

// Answer:
// [
//   { status: 'fulfilled', value: 1 },
//   { status: 'rejected', reason: 'Error' },
//   { status: 'fulfilled', value: 3 }
// ]

// Question 16: Async/Await Error Handling
console.log("=== Question 16: Async/Await Error Handling ===");
async function asyncErrorTest() {
  try {
    await Promise.reject("Error");
    console.log("Success"); // Will this execute?
  } catch (error) {
    console.log(error); // What is the output?
  }
}

asyncErrorTest();

// Answer:
// "Error" (await throws the rejected value, caught by catch block)

// Question 17: Async/Await without await
console.log("=== Question 17: Async Function without await ===");
async function asyncNoAwait() {
  Promise.reject("Error"); // Missing await!
  console.log("After reject");
}

asyncNoAwait().catch(err => {
  console.log("Caught:", err); // Will this execute?
});

// Answer:
// "After reject" (unhandled promise rejection, catch won't execute)
// Warning: Unhandled promise rejection

// Question 18: Promise.race
console.log("=== Question 18: Promise.race ===");
Promise.race([
  new Promise(resolve => setTimeout(() => resolve("Slow"), 2000)),
  new Promise(resolve => setTimeout(() => resolve("Fast"), 1000)),
  Promise.reject("Error")
])
  .then(result => {
    console.log(result); // What is the output?
  })
  .catch(error => {
    console.log(error); // Will this execute?
  });

// Answer:
// "Error" (rejection wins immediately in Promise.race)

// ===================================================================
// SECTION 4: EVENT LOOP & CALL STACK
// ===================================================================

// Question 19: Call Stack Execution Order
console.log("=== Question 19: Call Stack Order ===");
function eventLoopTest1() {
  console.log(1);
  
  setTimeout(() => console.log(2), 0);
  
  Promise.resolve().then(() => console.log(3));
  
  console.log(4);
}

eventLoopTest1();

// Answer:
// 1 (synchronous)
// 4 (synchronous)
// 3 (microtask queue - Promise)
// 2 (macrotask queue - setTimeout)

// Question 20: Nested setTimeout vs Promise
console.log("=== Question 20: Nested Timers vs Promise ===");
function eventLoopTest2() {
  setTimeout(() => console.log(1), 0);
  
  Promise.resolve().then(() => {
    console.log(2);
    setTimeout(() => console.log(3), 0);
  });
  
  Promise.resolve().then(() => console.log(4));
  
  setTimeout(() => console.log(5), 0);
}

eventLoopTest2();

// Answer:
// 2 (first Promise microtask)
// 4 (second Promise microtask)
// 1 (first setTimeout macrotask)
// 5 (second setTimeout macrotask)
// 3 (nested setTimeout macrotask)

// Question 21: async/await in Event Loop
console.log("=== Question 21: Async/Await in Event Loop ===");
async function eventLoopTest3() {
  console.log(1);
  
  await Promise.resolve();
  console.log(2);
  
  setTimeout(() => console.log(3), 0);
  
  Promise.resolve().then(() => console.log(4));
  
  console.log(5);
}

eventLoopTest3();
console.log(6);

// Answer:
// 1 (synchronous)
// 6 (synchronous in main thread)
// 2 (await continuation - microtask)
// 5 (synchronous after await)
// 4 (Promise microtask)
// 3 (setTimeout macrotask)

// Question 22: Multiple Promise.then chains
console.log("=== Question 22: Multiple Promise Chains ===");
function eventLoopTest4() {
  Promise.resolve()
    .then(() => console.log(1))
    .then(() => console.log(2));
  
  Promise.resolve()
    .then(() => console.log(3))
    .then(() => console.log(4));
  
  console.log(5);
}

eventLoopTest4();

// Answer:
// 5 (synchronous)
// 1 (first Promise chain)
// 3 (second Promise chain)
// 2 (first chain continues)
// 4 (second chain continues)

// ===================================================================
// SECTION 5: ARRAYS & ARRAY METHODS
// ===================================================================

// Question 23: Array Mutation in forEach
console.log("=== Question 23: Array Mutation ===");
const arr1 = [1, 2, 3, 4, 5];
arr1.forEach((item, index) => {
  arr1[index] = item * 2;
});
console.log(arr1); // What is the output?

// Answer:
// [2, 4, 6, 8, 10] (forEach can mutate the array)

// Question 24: map vs forEach Return Value
console.log("=== Question 24: map vs forEach ===");
const arr2 = [1, 2, 3];

const mapResult = arr2.map(x => x * 2);
const forEachResult = arr2.forEach(x => x * 2);

console.log(mapResult); // What is the output?
console.log(forEachResult); // What is the output?

// Answer:
// [2, 4, 6] (map returns new array)
// undefined (forEach returns undefined)

// Question 25: Array reduce with Accumulator
console.log("=== Question 25: Array reduce ===");
{
  const arr3 = [1, 2, 3, 4];

  const result = arr3.reduce((acc, curr) => {
    return acc + curr;
  }, 10);

  console.log(result); // What is the output?
}

// Answer:
// 20 (10 + 1 + 2 + 3 + 4)

// Question 26: Array filter with index
console.log("=== Question 26: Array filter ===");
const arr4 = [10, 20, 30, 40, 50];

const filtered = arr4.filter((item, index) => {
  return index % 2 === 0;
});

console.log(filtered); // What is the output?

// Answer:
// [10, 30, 50] (items at even indices: 0, 2, 4)

// Question 27: Nested Array Methods
console.log("=== Question 27: Nested Array Methods ===");
const arr5 = [1, 2, 3, 4, 5];

const result2 = arr5
  .filter(x => x % 2 === 0)
  .map(x => x * 2)
  .reduce((acc, curr) => acc + curr, 0);

console.log(result2); // What is the output?

// Answer:
// 12 (filter: [2, 4] → map: [4, 8] → reduce: 0 + 4 + 8 = 12)

// Question 28: Array find vs filter
console.log("=== Question 28: Array find ===");
const arr6 = [1, 2, 3, 4, 5];

const found = arr6.find(x => x > 3);
const filtered2 = arr6.filter(x => x > 3);

console.log(found); // What is the output?
console.log(filtered2); // What is the output?

// Answer:
// 4 (find returns first matching element)
// [4, 5] (filter returns all matching elements)

// ===================================================================
// SECTION 6: OBJECTS & THIS CONTEXT
// ===================================================================

// Question 29: this in Regular Function vs Arrow Function
console.log("=== Question 29: this Binding ===");
{
  const obj1 = {
    name: "John",
    
    regularFunc: function() {
      console.log(this.name); // What is the output?
    },
    
    arrowFunc: () => {
      console.log(this.name); // What is the output?
    }
  };

  obj1.regularFunc(); // Called as method
  obj1.arrowFunc(); // Arrow function doesn't bind this
}

// Answer:
// "John" (regular function has 'this' bound to obj1)
// undefined (arrow function has 'this' from lexical scope, likely global/window)

// Question 30: this in Nested Functions
console.log("=== Question 30: this in Nested Functions ===");
{
  const obj2 = {
    name: "John",
    
    outer: function() {
      console.log(this.name); // What is the output?
      
      function inner() {
        console.log(this.name); // What is the output?
      }
      
      inner();
    }
  };

  obj2.outer();
}

// Answer:
// "John" (outer function has 'this' bound to obj2)
// undefined (inner function loses 'this' binding, defaults to global/window)

// Question 31: bind, call, apply
console.log("=== Question 31: bind, call, apply ===");
const obj3 = {
  name: "John",
  greet: function(greeting, punctuation) {
    console.log(greeting + " " + this.name + punctuation);
  }
};

const obj4 = { name: "Jane" };

obj3.greet.call(obj4, "Hello", "!"); // What is the output?
obj3.greet.apply(obj4, ["Hi", "?"]); // What is the output?

const boundGreet = obj3.greet.bind(obj4, "Hey");
boundGreet("!!"); // What is the output?

// Answer:
// "Hello Jane!" (call with arguments)
// "Hi Jane?" (apply with array of arguments)
// "Hey Jane!!" (bind creates new function with bound this)

// Question 32: Object Property Access
console.log("=== Question 32: Object Property Access ===");
const obj5 = {
  "first name": "John",
  123: "number key",
  true: "boolean key"
};

console.log(obj5["first name"]); // What is the output?
console.log(obj5[123]); // What is the output?
console.log(obj5.true); // What is the output?
console.log(obj5["true"]); // What is the output?

// Answer:
// "John" (bracket notation for space in key)
// "number key" (number key converted to string)
// "boolean key" (dot notation, 'true' converted to string)
// "boolean key" (bracket notation, same result)

// Question 33: Object Spread and Reference
console.log("=== Question 33: Object Spread ===");
const obj6 = { a: 1, b: 2 };
const obj7 = { ...obj6, c: 3 };
const obj8 = obj6;

obj6.a = 10;

console.log(obj6); // What is the output?
console.log(obj7); // What is the output?
console.log(obj8); // What is the output?

// Answer:
// { a: 10, b: 2 } (original modified)
// { a: 1, b: 2, c: 3 } (spread creates shallow copy)
// { a: 10, b: 2 } (obj8 references same object as obj6)

// ===================================================================
// SECTION 7: FUNCTIONS & SCOPE
// ===================================================================

// Question 34: Function Declaration vs Expression
console.log("=== Question 34: Function Declaration vs Expression ===");
console.log(typeof func1); // What is the output?
console.log(typeof func2); // What is the output?

function func1() {
  return "declared";
}

var func2 = function() {
  return "expressed";
};

// Answer:
// "function" (function declaration is hoisted)
// "undefined" (var is hoisted but function expression is not)

// Question 35: Arguments Object
console.log("=== Question 35: Arguments Object ===");
function argumentsTest(a, b) {
  console.log(arguments.length); // What is the output?
  console.log(arguments[0]); // What is the output?
  console.log(a); // What is the output?
  
  arguments[0] = 100;
  console.log(a); // What is the output?
}

argumentsTest(1, 2, 3);

// Answer:
// 3 (number of arguments passed)
// 1 (first argument)
// 1 (parameter a)
// 100 (modifying arguments modifies parameters in non-strict mode)

// Question 36: Rest Parameters vs Arguments
console.log("=== Question 36: Rest Parameters ===");
function restTest(...args) {
  console.log(args); // What is the output?
  console.log(Array.isArray(args)); // What is the output?
  console.log(Array.isArray(arguments)); // What is the output?
}

restTest(1, 2, 3);

// Answer:
// [1, 2, 3] (rest parameters create array)
// true (rest parameters are arrays)
// false (arguments is array-like but not array)

// Question 37: Default Parameters
console.log("=== Question 37: Default Parameters ===");
function defaultTest(a = 1, b = a + 1) {
  console.log(a, b); // What is the output?
}

defaultTest(); // What is the output?
defaultTest(10); // What is the output?
defaultTest(10, 20); // What is the output?
defaultTest(undefined, 20); // What is the output?

// Answer:
// 1 2 (a = 1, b = 1 + 1 = 2)
// 10 11 (a = 10, b = 10 + 1 = 11)
// 10 20 (both provided)
// 1 20 (undefined triggers default, a = 1, b = 20)

// Question 38: Arrow Function vs Regular Function
console.log("=== Question 38: Arrow Function Limitations ===");
const arrowTest = {
  regular: function() {
    console.log(arguments); // What is the output?
  },
  
  arrow: () => {
    console.log(arguments); // What is the output?
  },
  
  regularNew: function() {
    return new.target; // What is the output?
  },
  
  arrowNew: () => {
    return new.target; // What is the output?
  }
};

arrowTest.regular(1, 2, 3);
// arrowTest.arrow(1, 2, 3); // Error: arguments is not defined
// const instance1 = new arrowTest.regularNew(); // Returns constructor
// const instance2 = new arrowTest.arrowNew(); // Error: arrow functions cannot be constructors

// Answer:
// Arguments(3) [1, 2, 3] (regular functions have arguments)
// ReferenceError: arguments is not defined (arrow functions don't have arguments)
// Arrow functions cannot be used as constructors (no new.target)

// ===================================================================
// SECTION 8: CLASSES & INHERITANCE
// ===================================================================

// Question 39: Class Inheritance
console.log("=== Question 39: Class Inheritance ===");
class Parent {
  constructor(name) {
    this.name = name;
    console.log("Parent constructor");
  }
  
  greet() {
    return `Hello, I'm ${this.name}`;
  }
}

class Child extends Parent {
  constructor(name, age) {
    super(name);
    this.age = age;
    console.log("Child constructor");
  }
  
  greet() {
    return super.greet() + ` and I'm ${this.age}`;
  }
}

{
  const child = new Child("John", 25);
  console.log(child.greet()); // What is the output?
}

// Answer:
// "Parent constructor"
// "Child constructor"
// "Hello, I'm John and I'm 25"

// Question 40: Static Methods
console.log("=== Question 40: Static Methods ===");
class MathUtils {
  static add(a, b) {
    return a + b;
  }
  
  multiply(a, b) {
    return a * b;
  }
}

const util = new MathUtils();

console.log(MathUtils.add(1, 2)); // What is the output?
console.log(util.multiply(2, 3)); // What is the output?
// console.log(util.add(1, 2)); // Error: util.add is not a function
// console.log(MathUtils.multiply(2, 3)); // Error: MathUtils.multiply is not a function

// Answer:
// 3 (static method called on class)
// 6 (instance method called on instance)

// Question 41: Private Fields (ES2022)
console.log("=== Question 41: Private Fields ===");
class BankAccount {
  #balance = 0; // Private field
  
  constructor(initialBalance) {
    this.#balance = initialBalance;
  }
  
  deposit(amount) {
    this.#balance += amount;
  }
  
  getBalance() {
    return this.#balance;
  }
}

const account = new BankAccount(100);
account.deposit(50);
console.log(account.getBalance()); // What is the output?
// console.log(account.#balance); // SyntaxError: Private field '#balance' must be declared in an enclosing class

// Answer:
// 150 (private field accessed through method)
// SyntaxError if trying to access directly

// Question 42: getter and setter
console.log("=== Question 42: Getters and Setters ===");
class Temperature {
  constructor(celsius) {
    this._celsius = celsius;
  }
  
  get celsius() {
    return this._celsius;
  }
  
  set celsius(value) {
    if (value < -273.15) {
      throw new Error("Temperature cannot be below absolute zero");
    }
    this._celsius = value;
  }
  
  get fahrenheit() {
    return this._celsius * 9/5 + 32;
  }
}

const temp = new Temperature(25);
console.log(temp.celsius); // What is the output?
console.log(temp.fahrenheit); // What is the output?

temp.celsius = 30;
console.log(temp.fahrenheit); // What is the output?

// Answer:
// 25 (getter)
// 77 (getter calculation)
// 86 (after setter modifies celsius)

// ===================================================================
// SECTION 9: GENERATORS & ITERATORS
// ===================================================================

// Question 43: Basic Generator
console.log("=== Question 43: Basic Generator ===");
function* simpleGenerator() {
  yield 1;
  yield 2;
  yield 3;
}

const gen = simpleGenerator();

console.log(gen.next()); // What is the output?
console.log(gen.next()); // What is the output?
console.log(gen.next()); // What is the output?
console.log(gen.next()); // What is the output?

// Answer:
// { value: 1, done: false }
// { value: 2, done: false }
// { value: 3, done: false }
// { value: undefined, done: true }

// Question 44: Generator with return
console.log("=== Question 44: Generator with return ===");
function* generatorWithReturn() {
  yield 1;
  return "done";
  yield 2; // This will never execute
}

const gen2 = generatorWithReturn();

console.log(gen2.next()); // What is the output?
console.log(gen2.next()); // What is the output?
console.log(gen2.next()); // What is the output?

// Answer:
// { value: 1, done: false }
// { value: "done", done: true } (return terminates generator)
// { value: undefined, done: true }

// Question 45: Generator with yield*
console.log("=== Question 45: Generator Delegation ===");
function* generator1() {
  yield 1;
  yield 2;
}

function* generator2() {
  yield* generator1();
  yield 3;
}

const gen3 = generator2();

console.log(gen3.next()); // What is the output?
console.log(gen3.next()); // What is the output?
console.log(gen3.next()); // What is the output?

// Answer:
// { value: 1, done: false }
// { value: 2, done: false }
// { value: 3, done: false }

// Question 46: Generator with Parameters
console.log("=== Question 46: Generator with Parameters ===");
function* generatorWithParams() {
  const x = yield 1;
  const y = yield x + 2;
  yield y + 3;
}

const gen4 = generatorWithParams();

console.log(gen4.next()); // What is the output?
console.log(gen4.next(10)); // What is the output?
console.log(gen4.next(20)); // What is the output?

// Answer:
// { value: 1, done: false } (first next() doesn't pass value)
// { value: 12, done: false } (10 is passed to x, yields 10 + 2)
// { value: 23, done: false } (20 is passed to y, yields 20 + 3)

// Question 47: Iterable Protocol
console.log("=== Question 47: Iterable Protocol ===");
const iterableObj = {
  [Symbol.iterator]: function* () {
    yield 1;
    yield 2;
    yield 3;
  }
};

for (const value of iterableObj) {
  console.log(value); // What is the output?
}

// Answer:
// 1
// 2
// 3

// Question 48: Iterator Protocol
console.log("=== Question 48: Iterator Protocol ===");
const customIterator = {
  data: [10, 20, 30],
  index: 0,
  
  [Symbol.iterator]() {
    return this;
  },
  
  next() {
    if (this.index < this.data.length) {
      return { value: this.data[this.index++], done: false };
    }
    return { done: true };
  }
};

for (const value of customIterator) {
  console.log(value); // What is the output?
}

// Answer:
// 10
// 20
// 30

// ===================================================================
// SECTION 10: MODULES (ES6)
// ===================================================================

// Question 49: Named Exports vs Default Export
// file: mathUtils.js
// export const add = (a, b) => a + b;
// export const subtract = (a, b) => a - b;
// export default function multiply(a, b) { return a * b; }

// file: main.js
// import multiply, { add, subtract } from './mathUtils.js';
// import { add as sum } from './mathUtils.js';

// console.log(add(1, 2)); // 3
// console.log(multiply(2, 3)); // 6
// console.log(sum(1, 2)); // 3 (aliased import)

// Answer:
// 3 (named export)
// 6 (default export)
// 3 (aliased named export)

// Question 50: Module Scope
console.log("=== Question 50: Module Scope ===");
// In ES6 modules, each module has its own scope
// Variables declared in a module are not added to the global scope

// Module A:
// let moduleVar = "I'm in module A";

// Module B:
// console.log(moduleVar); // ReferenceError: moduleVar is not defined

// Answer:
// ReferenceError (modules have isolated scope)

// ===================================================================
// SECTION 11: MEMORY MANAGEMENT & GARBAGE COLLECTION
// ===================================================================

// Question 51: Memory Leak with Closures
console.log("=== Question 51: Memory Leak Example ===");
function createLeak() {
  const largeArray = new Array(1000000).fill("data");
  
  return function() {
    console.log("Leak function");
    // largeArray is still referenced, cannot be garbage collected
  };
}

const leakFunction = createLeak();
// largeArray cannot be garbage collected while leakFunction exists
// Solution: Set leakFunction = null when done

// Answer:
// Memory leak: largeArray stays in memory as long as leakFunction exists

// Question 52: Circular Reference
console.log("=== Question 52: Circular Reference ===");
let objA = { name: "A" };
let objB = { name: "B" };

objA.ref = objB;
objB.ref = objA;

objA = null;
objB = null;

// In modern JavaScript engines, circular references are handled
// by garbage collector (mark-and-sweep algorithm)
// Objects will be collected if no external references exist

// Answer:
// Modern garbage collectors can handle circular references
// Objects will be collected when no external references remain

// Question 53: WeakMap vs Map for Memory
console.log("=== Question 53: WeakMap for Memory Management ===");
{
  let objKey = { id: 1 };

  const map = new Map();
  map.set(objKey, "value"); // Strong reference

  const weakMap = new WeakMap();
  weakMap.set(objKey, "value"); // Weak reference

  objKey = null; // Remove strong reference
}

// map still holds reference, objKey cannot be garbage collected
// weakMap allows garbage collection when objKey is null

// Answer:
// Map keeps object alive (cannot be garbage collected)
// WeakMap allows object to be garbage collected when no other references exist

// Question 54: Event Listener Memory Leak
console.log("=== Question 54: Event Listener Memory Leak ===");
function attachListeners() {
  const button = document.createElement("button");
  const handler = function() {
    console.log("Clicked");
  };
  
  button.addEventListener("click", handler);
  
  // If button is removed from DOM without removing listener,
  // handler and button cannot be garbage collected
  
  // Solution: Remove listener before removing element
  // button.removeEventListener("click", handler);
}

// Answer:
// Event listeners prevent garbage collection if not removed
// Always remove event listeners when elements are removed

// ===================================================================
// SECTION 12: ADVANCED PROMISES
// ===================================================================

// Question 55: Promise Constructor
console.log("=== Question 55: Promise Constructor ===");
const promise = new Promise((resolve, reject) => {
  console.log(1); // When does this execute?
  resolve(2);
  console.log(3); // When does this execute?
});

promise.then(val => {
  console.log(val); // What is the output?
});

console.log(4); // What is the output?

// Answer:
// 1 (executor runs immediately)
// 3 (executor continues synchronously)
// 4 (main thread continues)
// 2 (then callback runs in microtask queue)

// Question 56: Unhandled Promise Rejection
console.log("=== Question 56: Unhandled Rejection ===");
Promise.reject("Error")
  .then(null, err => {
    console.log("Caught:", err);
    throw "New Error";
  })
  .then(val => {
    console.log("Success:", val);
  })
  .catch(err => {
    console.log("Final catch:", err); // What is the output?
  });

// Answer:
// "Caught: Error"
// "Final catch: New Error" (re-thrown error caught by final catch)

// Question 57: Promise Chain Order
console.log("=== Question 57: Promise Chain Order ===");
Promise.resolve()
  .then(() => {
    console.log(1);
    return Promise.resolve(2);
  })
  .then(val => {
    console.log(val);
    return 3;
  })
  .then(val => {
    console.log(val);
  });

console.log(4);

// Answer:
// 4 (synchronous)
// 1 (first then)
// 2 (Promise.resolve unwrapped)
// 3 (value unwrapped)

// ===================================================================
// SECTION 13: ADVANCED ARRAYS
// ===================================================================

// Question 58: Array splice vs slice
console.log("=== Question 58: splice vs slice ===");
const arr7 = [1, 2, 3, 4, 5];

const sliced = arr7.slice(1, 3);
const spliced = arr7.splice(1, 2, 10, 20);

console.log(arr7); // What is the output?
console.log(sliced); // What is the output?
console.log(spliced); // What is the output?

// Answer:
// [1, 10, 20, 4, 5] (splice modifies original, removes 2 items, adds 10, 20)
// [2, 3] (slice returns new array, doesn't modify original)
// [2, 3] (splice returns removed elements)

// Question 59: Array sort
console.log("=== Question 59: Array sort ===");
const arr8 = [10, 2, 30, 4];

arr8.sort();
console.log(arr8); // What is the output?

arr8.sort((a, b) => a - b);
console.log(arr8); // What is the output?

// Answer:
// [10, 2, 30, 4] (lexicographic sort - string comparison)
// [2, 4, 10, 30] (numeric sort with comparison function)

// Question 60: Array flat and flatMap
console.log("=== Question 60: Array flat ===");
const arr9 = [1, [2, 3], [4, [5, 6]]];

console.log(arr9.flat()); // What is the output?
console.log(arr9.flat(2)); // What is the output?

const arr10 = [1, 2, 3];
console.log(arr10.flatMap(x => [x, x * 2])); // What is the output?

// Answer:
// [1, 2, 3, 4, [5, 6]] (flattens 1 level)
// [1, 2, 3, 4, 5, 6] (flattens 2 levels)
// [1, 2, 2, 4, 3, 6] (map + flat in one operation)

// ===================================================================
// SECTION 14: ADVANCED OBJECTS
// ===================================================================

// Question 61: Object.freeze vs Object.seal
console.log("=== Question 61: Object.freeze vs seal ===");
const obj9 = { a: 1, b: 2 };
const frozen = Object.freeze(obj9);
const sealed = Object.seal({ a: 1, b: 2 });

frozen.a = 10; // Attempted modification
sealed.a = 10; // Attempted modification
sealed.c = 3; // Attempted addition

console.log(frozen.a); // What is the output?
console.log(sealed.a); // What is the output?
console.log(sealed.c); // What is the output?

// Answer:
// 1 (frozen: cannot modify properties)
// 10 (sealed: can modify existing properties)
// undefined (sealed: cannot add new properties)

// Question 62: Object.keys vs Object.getOwnPropertyNames
console.log("=== Question 62: Object Property Enumerability ===");
const obj10 = {};

Object.defineProperty(obj10, "a", {
  value: 1,
  enumerable: true
});

Object.defineProperty(obj10, "b", {
  value: 2,
  enumerable: false
});

console.log(Object.keys(obj10)); // What is the output?
console.log(Object.getOwnPropertyNames(obj10)); // What is the output?

// Answer:
// ["a"] (only enumerable properties)
// ["a", "b"] (all own properties, enumerable or not)

// Question 63: Prototype Chain
console.log("=== Question 63: Prototype Chain ===");
function Parent() {
  this.parentProp = "parent";
}

Parent.prototype.parentMethod = function() {
  return "parent method";
};

function Child() {
  Parent.call(this);
  this.childProp = "child";
}

Child.prototype = Object.create(Parent.prototype);
Child.prototype.constructor = Child;

{
  const child = new Child();

  console.log(child.childProp); // What is the output?
  console.log(child.parentProp); // What is the output?
  console.log(child.parentMethod()); // What is the output?
  console.log(child.hasOwnProperty("parentMethod")); // What is the output?
}

// Answer:
// "child" (own property)
// "parent" (inherited from Parent constructor)
// "parent method" (from Parent.prototype)
// false (method is on prototype, not own property)

// ===================================================================
// SECTION 15: ADVANCED CLOSURES
// ===================================================================

// Question 64: Closure with setTimeout
console.log("=== Question 64: Closure with setTimeout ===");
function closureTimeout() {
  for (var i = 0; i < 3; i++) {
    (function(index) {
      setTimeout(function() {
        console.log(index); // What is the output?
      }, 100 * index);
    })(i);
  }
}

closureTimeout();

// Answer:
// 0 (after 0ms)
// 1 (after 100ms)
// 2 (after 200ms)
// Each closure captures different 'index' value

// Question 65: Module Pattern with Private State
console.log("=== Question 65: Module Pattern ===");
const counterModule = (function() {
  let count = 0; // Private variable
  
  return {
    increment: function() {
      count++;
      return count;
    },
    decrement: function() {
      count--;
      return count;
    },
    getCount: function() {
      return count;
    }
  };
})();

counterModule.increment();
counterModule.increment();
console.log(counterModule.getCount()); // What is the output?

// Answer:
// 2 (private count variable accessed through closure)

// ===================================================================
// SECTION 16: ADVANCED ASYNC/AWAIT
// ===================================================================

// Question 66: Parallel Execution with Promise.all
console.log("=== Question 66: Parallel Execution ===");
async function parallelExecution() {
  const [result1, result2, result3] = await Promise.all([
    Promise.resolve(1),
    Promise.resolve(2),
    Promise.resolve(3)
  ]);
  
  console.log(result1, result2, result3); // What is the output?
}

parallelExecution();

// Answer:
// 1 2 3 (all promises resolve in parallel)

// Question 67: Sequential Execution with await
console.log("=== Question 67: Sequential Execution ===");
async function sequentialExecution() {
  const result1 = await Promise.resolve(1);
  console.log(result1); // What is the output?
  
  const result2 = await Promise.resolve(2);
  console.log(result2); // What is the output?
  
  const result3 = await Promise.resolve(3);
  console.log(result3); // What is the output?
}

sequentialExecution();

// Answer:
// 1 (waits for first promise)
// 2 (waits for second promise)
// 3 (waits for third promise)

// Question 68: Error in Promise.all
console.log("=== Question 68: Promise.all Error Handling ===");
async function promiseAllError() {
  try {
    const results = await Promise.all([
      Promise.resolve(1),
      Promise.reject("Error"),
      Promise.resolve(3)
    ]);
    console.log(results); // Will this execute?
  } catch (error) {
    console.log(error); // What is the output?
  }
}

promiseAllError();

// Answer:
// "Error" (Promise.all fails on first rejection)

// Question 69: Promise.allSettled
console.log("=== Question 69: Promise.allSettled ===");
async function promiseAllSettled() {
  const results = await Promise.allSettled([
    Promise.resolve(1),
    Promise.reject("Error"),
    Promise.resolve(3)
  ]);
  
  console.log(results); // What is the output?
}

promiseAllSettled();

// Answer:
// [
//   { status: 'fulfilled', value: 1 },
//   { status: 'rejected', reason: 'Error' },
//   { status: 'fulfilled', value: 3 }
// ]

// ===================================================================
// SECTION 17: SYMBOL & WEAKMAP/WEAKSET
// ===================================================================

// Question 70: Symbol Uniqueness
console.log("=== Question 70: Symbol Uniqueness ===");
const sym1 = Symbol("key");
const sym2 = Symbol("key");

console.log(sym1 === sym2); // What is the output?

const sym3 = Symbol.for("key");
const sym4 = Symbol.for("key");

console.log(sym3 === sym4); // What is the output?

// Answer:
// false (Symbol() creates unique symbols)
// true (Symbol.for() creates symbols from global registry)

// Question 71: WeakMap
console.log("=== Question 71: WeakMap ===");
{
  const weakMap = new WeakMap();
  const obj = {};

  weakMap.set(obj, "value");
  console.log(weakMap.get(obj)); // What is the output?
}

// weakMap keys must be objects
// weakMap.set("string", "value"); // TypeError

// Answer:
// "value" (WeakMap stores values with object keys)
// TypeError if trying to use primitive keys

// Question 72: WeakSet
console.log("=== Question 72: WeakSet ===");
{
  const weakSet = new WeakSet();
  const obj1 = {};
  const obj2 = {};

  weakSet.add(obj1);
  weakSet.add(obj2);

  console.log(weakSet.has(obj1)); // What is the output?
}

// Answer:
// true (WeakSet stores object references)

// ===================================================================
// SECTION 18: DESTRUCTURING
// ===================================================================

// Question 73: Array Destructuring
console.log("=== Question 73: Array Destructuring ===");
const arr11 = [1, 2, 3, 4, 5];

const [a, b, ...rest] = arr11;
const [first, , third] = arr11;
const [x, y, z = 10] = [1, 2];

console.log(a, b, rest); // What is the output?
console.log(first, third); // What is the output?
console.log(x, y, z); // What is the output?

// Answer:
// 1 2 [3, 4, 5] (rest operator)
// 1 3 (skipping second element)
// 1 2 10 (default value for missing element)

// Question 74: Object Destructuring
console.log("=== Question 74: Object Destructuring ===");
{
  const obj11 = { name: "John", age: 30, city: "NYC" };

  const { name, age } = obj11;
  const { city: location } = obj11;
  const { country = "USA" } = obj11;

  console.log(name, age); // What is the output?
  console.log(location); // What is the output?
  console.log(country); // What is the output?
}

// Answer:
// "John" 30 (direct destructuring)
// "NYC" (renamed property)
// "USA" (default value for missing property)

// Question 75: Nested Destructuring
console.log("=== Question 75: Nested Destructuring ===");
const obj12 = {
  user: {
    name: "John",
    address: {
      city: "NYC",
      zip: "10001"
    }
  }
};

const { user: { name: userName, address: { city } } } = obj12;

console.log(userName, city); // What is the output?

// Answer:
// "John" "NYC" (nested destructuring with renaming)

// ===================================================================
// SECTION 19: TEMPLATE LITERALS & TAGGED TEMPLATES
// ===================================================================

// Question 76: Template Literals
console.log("=== Question 76: Template Literals ===");
{
  const name = "John";
  const age = 30;

  const message = `Hello, my name is ${name} and I'm ${age} years old.`;
  console.log(message); // What is the output?
}

// Answer:
// "Hello, my name is John and I'm 30 years old."

// Question 77: Tagged Templates
console.log("=== Question 77: Tagged Templates ===");
{
  function tag(strings, ...values) {
    console.log(strings); // What is the output?
    console.log(values); // What is the output?
    
    return strings[0] + values[0].toUpperCase() + strings[1];
  }

  const result = tag`Hello ${"world"}!`;
  console.log(result); // What is the output?
}

// Answer:
// ["Hello ", "!"] (template string parts)
// ["world"] (interpolated values)
// "Hello WORLD!"

// ===================================================================
// SECTION 20: COMPREHENSIVE MIXED QUESTIONS
// ===================================================================

// Question 78: Complex Async Flow
console.log("=== Question 78: Complex Async Flow ===");
async function complexAsync() {
  console.log(1);
  
  await Promise.resolve().then(() => console.log(2));
  
  setTimeout(() => console.log(3), 0);
  
  Promise.resolve().then(() => console.log(4));
  
  await new Promise(resolve => {
    console.log(5);
    resolve();
  });
  
  console.log(6);
}

complexAsync();
console.log(7);

// Answer:
// 1 (synchronous)
// 7 (synchronous)
// 2 (microtask from first await)
// 5 (synchronous in Promise executor)
// 4 (microtask from Promise.resolve)
// 6 (after second await)
// 3 (setTimeout macrotask)

// Question 79: Closure + Async + Loop
console.log("=== Question 79: Closure + Async + Loop ===");
async function closureAsyncLoop() {
  const results = [];
  
  for (let i = 0; i < 3; i++) {
    results.push(
      Promise.resolve(i).then(val => {
        return val * 2;
      })
    );
  }
  
  const resolved = await Promise.all(results);
  console.log(resolved); // What is the output?
}

closureAsyncLoop();

// Answer:
// [0, 2, 4] (each promise resolves with doubled value)

// Question 80: Generator + Async
console.log("=== Question 80: Generator + Async ===");
async function* asyncGenerator() {
  yield Promise.resolve(1);
  yield Promise.resolve(2);
  yield Promise.resolve(3);
}

(async () => {
  for await (const value of asyncGenerator()) {
    console.log(value); // What is the output?
  }
})();

// Answer:
// 1
// 2
// 3 (for-await-of automatically awaits each yielded promise)

// ===================================================================
// END OF QUESTIONS
// ===================================================================

// Note: To test these questions, run them one by one or comment out
// the ones you want to skip. Each question is designed to test
// understanding of JavaScript's core concepts and edge cases.



// ADVANCED JAVASCRIPT INTERVIEW QUESTIONS - OUTPUT BASED

// ==================== HOISTING & TDZ ====================

// Q1: What will be the output?
console.log(x);
var x = 5;
console.log(y);
let y = 10;

// Answer: undefined, ReferenceError
// Explanation: var is hoisted and initialized to undefined. let is in TDZ until declaration.


// Q2: What will be the output?
function test() {
  console.log(a);
  console.log(b);
  var a = 1;
  let b = 2;
}
test();

// Answer: undefined, ReferenceError
// Explanation: var a is hoisted as undefined, let b throws ReferenceError in TDZ.


// ==================== CLOSURES ====================

// Q3: What will be the output?
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}

// Answer: 3, 3, 3
// Explanation: var is function-scoped. All callbacks reference same i which is 3 after loop.


// Q4: What will be the output?
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}

// Answer: 0, 1, 2
// Explanation: let is block-scoped. Each iteration creates new binding for i.


// Q5: What will be the output?
function outer() {
  let count = 0;
  return function inner() {
    count++;
    return count;
  };
}
const fn = outer();
console.log(fn());
console.log(fn());

// Answer: 1, 2
// Explanation: Closure captures count variable. Each call increments and remembers state.


// ==================== TYPE COERCION ====================

// Q6: What will be the output?
console.log([] == ![]);

// Answer: true
// Explanation: ![] is false. [] == false → '' == false → 0 == 0 → true


// Q7: What will be the output?
console.log(1 + '2' + 3);
console.log(1 + 2 + '3');

// Answer: '123', '33'
// Explanation: String concatenation. 1+'2'='12', '12'+3='123'. 1+2=3, 3+'3'='33'.


// Q8: What will be the output?
console.log([] + []);
console.log([] + {});
console.log({} + []);

// Answer: '', '[object Object]', '[object Object]'
// Explanation: + operator coerces to strings. Empty arrays become ''.


// Q9: What will be the output?
console.log(true + true);
console.log(true - true);
console.log(true * false);

// Answer: 2, 0, 0
// Explanation: true coerces to 1, false to 0. 1+1=2, 1-1=0, 1*0=0.


// Q10: What will be the output?
console.log('5' - 3);
console.log('5' + 3);

// Answer: 2, '53'
// Explanation: - coerces to number: 5-3=2. + with string concatenates: '5'+'3'='53'.


// ==================== REFERENCE vs VALUE ====================

// Q11: What will be the output?
console.log([] == []);
console.log([] === []);
console.log({} == {});

// Answer: false, false, false
// Explanation: Arrays/objects compared by reference. Different instances never equal.


// Q12: What will be the output?
const obj = { a: 1 };
const obj2 = obj;
obj2.a = 2;
console.log(obj.a);

// Answer: 2
// Explanation: obj2 references same object. Mutating obj2 affects obj.


// Q13: What will be the output?
const arr = [1, 2, 3];
const arr2 = arr;
arr2.push(4);
console.log(arr.length);

// Answer: 4
// Explanation: arr2 is reference to arr. Pushing to arr2 modifies arr.


// ==================== EVENT LOOP & ASYNC ====================

// Q14: What's the order of output?
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');

// Answer: 1, 4, 3, 2
// Explanation: Sync code (1,4), microtasks/Promise (3), macrotasks/setTimeout (2).


// Q15: What's the order of output?
async function test() {
  console.log('1');
  await Promise.resolve();
  console.log('2');
}
test();
console.log('3');

// Answer: 1, 3, 2
// Explanation: '1' sync, await pauses, '3' sync, then '2' as microtask.


// Q16: What's the order of output?
console.log('Start');
setTimeout(() => console.log('Timeout'), 0);
Promise.resolve().then(() => console.log('Promise 1'));
queueMicrotask(() => console.log('Microtask'));
Promise.resolve().then(() => console.log('Promise 2'));
console.log('End');

// Answer: Start, End, Promise 1, Microtask, Promise 2, Timeout
// Explanation: Sync first, then all microtasks in order, finally macrotasks.


// Q17: What will be the output?
setTimeout(() => console.log('A'), 0);
Promise.resolve().then(() => {
  console.log('B');
  setTimeout(() => console.log('C'), 0);
});
console.log('D');

// Answer: D, B, A, C
// Explanation: Sync D, microtask B (queues C timeout), timeout A, timeout C.


// ==================== OPERATORS ====================

// Q18: What will be the output?
console.log(typeof null);
console.log(typeof undefined);
console.log(typeof NaN);

// Answer: 'object', 'undefined', 'number'
// Explanation: typeof null is 'object' (JS bug). NaN is number type.


// Q19: What will be the output?
console.log(null == undefined);
console.log(null === undefined);

// Answer: true, false
// Explanation: == has special rule for null/undefined. === requires same type.


// Q20: What will be the output?
console.log(0 || 1);
console.log(0 && 1);
console.log(2 || 3);
console.log(2 && 3);

// Answer: 1, 0, 2, 3
// Explanation: || returns first truthy (1, 2). && returns last if all truthy or first falsy (0, 3).


// Q21: What will be the output?
console.log(0 ?? 'default');
console.log(null ?? 'default');
console.log('' ?? 'default');

// Answer: 0, 'default', ''
// Explanation: ?? only treats null/undefined as nullish. 0 and '' are not nullish.


// Q22: What will be the output?
console.log(false == '0');
console.log(false === '0');
console.log('0' == 0);

// Answer: true, false, true
// Explanation: == coerces types. false=='0' → 0==0. === strict, no coercion.


// ==================== ARRAY METHODS ====================

// Q23: What will be the output?
const arr = [1, 2, 3];
arr[10] = 10;
console.log(arr.length);
console.log(arr[5]);

// Answer: 11, undefined
// Explanation: Setting arr[10] makes length 11. Indices 3-9 are empty slots.


// Q24: What will be the output?
const arr = [1, 2, 3];
const result = arr.map(x => {
  if (x === 2) return;
  return x * 2;
});
console.log(result);

// Answer: [2, undefined, 6]
// Explanation: map always returns same length. No return = undefined.


// Q25: What will be the output?
console.log([1, 2, 3].map(parseInt));

// Answer: [1, NaN, NaN]
// Explanation: map passes (value, index). parseInt('1',0)=1, parseInt('2',1)=NaN, parseInt('3',2)=NaN.


// Q26: What will be the output?
const arr = [1, 2, 3, 4, 5];
arr.length = 2;
console.log(arr);

// Answer: [1, 2]
// Explanation: Setting length truncates array. Elements beyond new length are removed.


// Q27: What will be the output?
const arr = [1, 2, 3];
delete arr[1];
console.log(arr);
console.log(arr.length);

// Answer: [1, empty, 3], 3
// Explanation: delete creates empty slot but doesn't change length.


// ==================== THIS BINDING ====================

// Q28: What will be the output?
const obj = {
  name: 'John',
  greet: function() {
    console.log(this.name);
  }
};
const fn = obj.greet;
fn();

// Answer: undefined
// Explanation: Lost context. fn() called without object, this is undefined/global.


// Q29: What will be the output?
const obj = {
  name: 'John',
  greet: () => console.log(this.name)
};
obj.greet();

// Answer: undefined
// Explanation: Arrow functions don't bind this. Inherits from outer scope.


// Q30: What will be the output?
function Person(name) {
  this.name = name;
}
const p1 = Person('Alice');
console.log(p1);
console.log(window.name);

// Answer: undefined, 'Alice' (in browser)
// Explanation: Forgot 'new'. this refers to global. p1 is undefined, name set on global.


// ==================== PROTOTYPES ====================

// Q31: What will be the output?
function Person(name) {
  this.name = name;
}
Person.prototype.greet = function() {
  return 'Hi ' + this.name;
};
const p = new Person('Alice');
delete p.greet;
console.log(p.greet());

// Answer: 'Hi Alice'
// Explanation: delete only removes own properties. greet is on prototype.


// Q32: What will be the output?
const obj = Object.create(null);
console.log(obj.toString);

// Answer: undefined
// Explanation: Object.create(null) has no prototype. No inherited methods.


// ==================== DESTRUCTURING ====================

// Q33: What will be the output?
const [a, , b] = [1, 2, 3];
console.log(a, b);

// Answer: 1, 3
// Explanation: Destructuring skips second element with empty comma.


// Q34: What will be the output?
const { a: x = 10, b: y = 20 } = { a: 5 };
console.log(x, y);

// Answer: 5, 20
// Explanation: Rename and default. a exists (5), b doesn't (default 20).


// Q35: What will be the output?
const [a, b, c = 3] = [1, 2];
console.log(c);

// Answer: 3
// Explanation: c not in array, uses default value 3.


// ==================== SPREAD & REST ====================

// Q36: What will be the output?
const obj1 = { a: 1, b: 2 };
const obj2 = { b: 3, c: 4 };
const merged = { ...obj1, ...obj2 };
console.log(merged.b);

// Answer: 3
// Explanation: obj2.b overwrites obj1.b. Last wins.


// Q37: What will be the output?
const arr = [1, 2, 3];
const arr2 = [...arr];
arr2.push(4);
console.log(arr.length);

// Answer: 3
// Explanation: Spread creates shallow copy. arr2 is new array.


// Q38: What will be the output?
function sum(...args) {
  return args.reduce((a, b) => a + b);
}
console.log(sum(1, 2, 3, 4));

// Answer: 10
// Explanation: Rest parameter collects arguments into array. 1+2+3+4=10.


// ==================== CLASSES ====================

// Q39: What will be the output?
class Animal {
  constructor(name) {
    this.name = name;
  }
}
class Dog extends Animal {
  constructor(name, breed) {
    this.breed = breed;
    super(name);
  }
}
const dog = new Dog('Max', 'Labrador');

// Answer: ReferenceError
// Explanation: Must call super() before accessing this in derived constructor.


// Q40: What will be the output?
class Counter {
  count = 0;
  increment = () => {
    this.count++;
  }
}
const c1 = new Counter();
const c2 = new Counter();
console.log(c1.increment === c2.increment);

// Answer: false
// Explanation: Arrow function as class field creates new function per instance.


// ==================== SYMBOLS ====================

// Q41: What will be the output?
const s1 = Symbol('test');
const s2 = Symbol('test');
console.log(s1 === s2);

// Answer: false
// Explanation: Every Symbol() creates unique symbol, even with same description.


// Q42: What will be the output?
const s1 = Symbol.for('test');
const s2 = Symbol.for('test');
console.log(s1 === s2);

// Answer: true
// Explanation: Symbol.for() uses global registry. Same key returns same symbol.


// ==================== PROMISES ====================

// Q43: What will be the output?
Promise.resolve(1)
  .then(x => { throw new Error('err'); })
  .catch(e => console.log('caught'))
  .then(() => console.log('done'));

// Answer: 'caught', 'done'
// Explanation: catch handles error and returns resolved promise. Chain continues.


// Q44: What will be the output?
Promise.resolve(1)
  .then(x => x + 1)
  .then(x => { throw x; })
  .catch(e => e + 1)
  .then(x => console.log(x));

// Answer: 3
// Explanation: 1 → 2 → throw 2 → catch returns 3 → logs 3.


// Q45: What will be the output?
const p1 = Promise.resolve(1);
const p2 = Promise.reject(2);
Promise.all([p1, p2])
  .then(r => console.log(r))
  .catch(e => console.log(e));

// Answer: 2
// Explanation: Promise.all fails fast. First rejection triggers catch.


// ==================== GENERATORS ====================

// Q46: What will be the output?
function* gen() {
  yield 1;
  yield 2;
  return 3;
}
const g = gen();
console.log(g.next());
console.log(g.next());
console.log(g.next());

// Answer: {value: 1, done: false}, {value: 2, done: false}, {value: 3, done: true}
// Explanation: yield returns {done: false}, return returns {done: true}.


// Q47: What will be the output?
function* gen() {
  const x = yield 1;
  console.log(x);
  yield 2;
}
const g = gen();
g.next();
g.next(10);

// Answer: 10
// Explanation: next(10) passes 10 as result of yield expression. x = 10.


// ==================== OBJECT METHODS ====================

// Q48: What will be the output?
const obj = { a: 1 };
Object.defineProperty(obj, 'b', {
  value: 2,
  enumerable: false
});
console.log(Object.keys(obj));

// Answer: ['a']
// Explanation: Object.keys() only returns enumerable properties.


// Q49: What will be the output?
const obj = Object.freeze({ a: 1, b: { c: 2 } });
obj.a = 2;
obj.b.c = 3;
console.log(obj.a, obj.b.c);

// Answer: 1, 3
// Explanation: freeze is shallow. obj.a can't change, but nested obj.b.c can.


// Q50: What will be the output?
const obj1 = { a: 1 };
const obj2 = Object.create(obj1);
obj2.a = 2;
delete obj2.a;
console.log(obj2.a);

// Answer: 1
// Explanation: delete removes own property. Prototype property remains accessible.


// ==================== COMPLEX SCENARIOS ====================

// Q51: What will be the output?
const a = {};
const b = { key: 'b' };
const c = { key: 'c' };
a[b] = 123;
a[c] = 456;
console.log(a[b]);

// Answer: 456
// Explanation: Objects as keys convert to '[object Object]'. Both b and c become same key.


// Q52: What will be the output?
console.log(1 < 2 < 3);
console.log(3 > 2 > 1);

// Answer: true, false
// Explanation: 1<2=true, true<3 → 1<3=true. 3>2=true, true>1 → 1>1=false.


// Q53: What will be the output?
const arr = [1, 2, 3];
arr.foo = 'bar';
console.log(arr.length);
console.log(Object.keys(arr));

// Answer: 3, ['0', '1', '2', 'foo']
// Explanation: Custom properties don't affect length. keys() shows all enumerable properties.


// Q54: What will be the output?
function foo() {
  return
  {
    bar: 'hello'
  };
}
console.log(foo());

// Answer: undefined
// Explanation: Automatic semicolon insertion. 'return;' happens, object never returned.


// Q55: What will be the output?
console.log(+'123');
console.log(-'123');
console.log(+true);
console.log(+[]);
console.log(+[1, 2]);

// Answer: 123, -123, 1, 0, NaN
// Explanation: Unary + coerces to number. [] → 0, [1,2] → '1,2' → NaN.


// Q56: What will be the output?
const x = 10;
const obj = {
  x: 20,
  getX: function() {
    const x = 30;
    return this.x;
  }
};
console.log(obj.getX());

// Answer: 20
// Explanation: this.x refers to obj.x (20), not local x (30) or outer x (10).


// Q57: What will be the output?
console.log(!!'');
console.log(!!'false');
console.log(!!0);
console.log(!!{});

// Answer: false, true, false, true
// Explanation: !! converts to boolean. '' and 0 are falsy. 'false' and {} are truthy.


// Q58: What will be the output?
const arr = [1, 2, 3, 4, 5];
const [first, ...rest] = arr;
console.log(first, rest);

// Answer: 1, [2, 3, 4, 5]
// Explanation: Rest in destructuring collects remaining elements.


// Q59: What will be the output?
function* infinite() {
  let i = 0;
  while (true) {
    yield i++;
  }
}
const gen = infinite();
console.log(gen.next().value);
console.log(gen.next().value);
console.log(gen.next().value);

// Answer: 0, 1, 2
// Explanation: Generator pauses at yield. Maintains state between calls.


// Q60: What will be the output?
const promise = new Promise((resolve, reject) => {
  console.log('A');
  resolve('B');
  console.log('C');
});
promise.then(val => console.log(val));
console.log('D');

// Answer: A, C, D, B
// Explanation: Promise executor is sync (A, C). Then D sync. Promise callback is microtask (B).

// SUPER ADVANCED & TRICKY JAVASCRIPT INTERVIEW QUESTIONS

// ==================== ADVANCED HOISTING & TDZ ====================

// Q1: What will be the output?
function test() {
    console.log(a);
    console.log(foo());
    var a = 1;
    function foo() {
      return 2;
    }
  }
  test();
  
  // Answer: undefined, 2
  // Explanation: var a hoisted as undefined. function foo hoisted entirely, so callable before declaration.
  
  
  // Q2: What will be the output?
  var x = 1;
  function test() {
    console.log(x);
    let x = 2;
  }
  test();
  
  // Answer: ReferenceError
  // Explanation: let x creates TDZ in block scope. Even though var x=1 exists outside, inner let x shadows it and is in TDZ.
  
  
  // Q3: What will be the output?
  console.log(typeof a);
  let a;
  
  // Answer: ReferenceError
  // Explanation: typeof doesn't save from TDZ for let/const. Only works for undeclared vars.
  
  
  // Q4: What will be the output?
  function test() {
    var a = b = 1;
  }
  test();
  console.log(typeof a);
  console.log(typeof b);
  
  // Answer: 'undefined', 'number'
  // Explanation: Only 'a' is var declared. 'b = 1' creates global variable. a is local, b is global.
  
  
  // Q5: What will be the output?
  {
    function foo() { return 1; }
  }
  {
    function foo() { return 2; }
  }
  console.log(foo());
  
  // Answer: 2 (or error in strict mode)
  // Explanation: Block-scoped function declarations have weird behavior. In non-strict, last wins.
  
  
  // ==================== EXTREME CLOSURES ====================
  
  // Q6: What will be the output?
  function createFunctions() {
    var result = [];
    for (var i = 0; i < 3; i++) {
      result[i] = function() {
        return i * i;
      };
    }
    return result;
  }
  var funcs = createFunctions();
  console.log(funcs[0]());
  console.log(funcs[1]());
  console.log(funcs[2]());
  
  // Answer: 9, 9, 9
  // Explanation: All closures reference same 'i'. After loop i=3, so 3*3=9 for all.
  
  
  // Q7: What will be the output?
  for (var i = 0; i < 3; i++) {
    (function(j) {
      setTimeout(() => console.log(j), 0);
    })(i);
  }
  
  // Answer: 0, 1, 2
  // Explanation: IIFE creates new scope per iteration, capturing current i value as j.
  
  
  // Q8: What will be the output?
  function outer() {
    var x = 10;
    return {
      x: 20,
      foo: function() {
        console.log(this.x);
      },
      bar: () => {
        console.log(this.x);
      }
    };
  }
  const obj = outer();
  obj.foo();
  obj.bar();
  
  // Answer: 20, undefined
  // Explanation: foo() is regular function, this=obj (20). bar() is arrow, this=outer scope (undefined).
  
  
  // Q9: What will be the output?
  let x = 10;
  function foo() {
    console.log(x);
    let x = 20;
  }
  foo();
  
  // Answer: ReferenceError
  // Explanation: Inner let x creates TDZ. Can't access x before its declaration, even if outer x exists.
  
  
  // Q10: What will be the output?
  function test() {
    var x = 1;
    if (true) {
      var x = 2;
      console.log(x);
    }
    console.log(x);
  }
  test();
  
  // Answer: 2, 2
  // Explanation: var is function-scoped, not block-scoped. Both x refer to same variable.
  
  
  // ==================== INSANE TYPE COERCION ====================
  
  // Q11: What will be the output?
  console.log([] + null + 1);
  
  // Answer: 'null1'
  // Explanation: [] → '', '' + null → 'null', 'null' + 1 → 'null1'.
  
  
  // Q12: What will be the output?
  console.log([1, 2] + [3, 4]);
  
  // Answer: '1,23,4'
  // Explanation: Arrays convert to strings: '1,2' + '3,4' = '1,23,4'.
  
  
  // Q13: What will be the output?
  console.log(true + false);
  console.log(true - false);
  console.log(true * false);
  console.log(true / false);
  
  // Answer: 1, 1, 0, Infinity
  // Explanation: true=1, false=0. 1+0=1, 1-0=1, 1*0=0, 1/0=Infinity.
  
  
  // Q14: What will be the output?
  console.log('5' - - '3');
  
  // Answer: 8
  // Explanation: - - is double negation. '5' - (-'3') → 5 - (-3) → 5 + 3 = 8.
  
  
  // Q15: What will be the output?
  console.log([] == 0);
  console.log([] == '');
  console.log([] == false);
  console.log([0] == false);
  
  // Answer: true, true, true, true
  // Explanation: [] → '' → 0. 0==0, ''=='', 0==false (coerced), [0]→'0'→0==false.
  
  
  // Q16: What will be the output?
  console.log(NaN === NaN);
  console.log(Object.is(NaN, NaN));
  console.log(NaN == NaN);
  
  // Answer: false, true, false
  // Explanation: NaN never equals itself with == or ===. Object.is() treats NaN specially.
  
  
  // Q17: What will be the output?
  console.log(+0 === -0);
  console.log(Object.is(+0, -0));
  
  // Answer: true, false
  // Explanation: === treats +0 and -0 as equal. Object.is() distinguishes them.
  
  
  // Q18: What will be the output?
  console.log(!![]);
  console.log([] == true);
  console.log([] == false);
  
  // Answer: true, false, true
  // Explanation: !![] → true (object is truthy). [] → '' → 0 == false (true), but != true.
  
  
  // Q19: What will be the output?
  console.log('2' > '12');
  console.log(2 > '12');
  
  // Answer: true, false
  // Explanation: String comparison: '2' > '1' (true). Number comparison: 2 > 12 (false).
  
  
  // Q20: What will be the output?
  console.log(null > 0);
  console.log(null == 0);
  console.log(null >= 0);
  
  // Answer: false, false, true
  // Explanation: null converts to 0 for > >= < <=, but null == only undefined. So null≥0 is true!
  
  
  // ==================== CRAZY OPERATORS ====================
  
  // Q21: What will be the output?
  let a = 1;
  let b = a++ + ++a + a++ + a;
  console.log(b);
  
  // Answer: 10
  // Explanation: 1 + 3 + 3 + 4 = 11. Wait: a++(1, a=2) + ++a(a=3, 3) + a++(3, a=4) + a(4) = 1+3+3+4=11. Actually 1+3+3+3=10.
  
  
  // Q22: What will be the output?
  let x = 5;
  let y = x++ + ++x + x;
  console.log(y);
  
  // Answer: 19
  // Explanation: x++(5, x=6) + ++x(x=7, 7) + x(7) = 5 + 7 + 7 = 19.
  
  
  // Q23: What will be the output?
  console.log(1 < 2 < 3);
  console.log(3 > 2 > 1);
  
  // Answer: true, false
  // Explanation: (1<2)=true, true<3 → 1<3=true. (3>2)=true, true>1 → 1>1=false.
  
  
  // Q24: What will be the output?
  console.log(typeof typeof 1);
  
  // Answer: 'string'
  // Explanation: typeof 1 = 'number'. typeof 'number' = 'string'.
  
  
  // Q25: What will be the output?
  console.log(2 ** 3 ** 2);
  
  // Answer: 512
  // Explanation: ** is right-associative. 3**2=9, 2**9=512.
  
  
  // Q26: What will be the output?
  console.log([] !== []);
  console.log({} !== {});
  console.log(NaN !== NaN);
  
  // Answer: true, true, true
  // Explanation: Arrays/objects compared by reference (different instances). NaN never equals itself.
  
  
  // Q27: What will be the output?
  console.log(010);
  console.log(0x10);
  console.log(0b10);
  
  // Answer: 8, 16, 2
  // Explanation: 010 is octal (8). 0x10 is hex (16). 0b10 is binary (2).
  
  
  // Q28: What will be the output?
  console.log(!!null);
  console.log(!!undefined);
  console.log(!!'');
  console.log(!!0);
  
  // Answer: false, false, false, false
  // Explanation: All are falsy values. !! converts to boolean false.
  
  
  // Q29: What will be the output?
  let a = 1, b = 2, c = 3;
  console.log(a += b += c);
  
  // Answer: 6
  // Explanation: Right-associative. b += c → b=5, a += b → a=6.
  
  
  // Q30: What will be the output?
  console.log(void 0);
  console.log(void 1);
  console.log(void(0));
  
  // Answer: undefined, undefined, undefined
  // Explanation: void always returns undefined regardless of operand.
  
  
  // ==================== ADVANCED EVENT LOOP ====================
  
  // Q31: What's the order?
  Promise.resolve().then(() => console.log('1'));
  queueMicrotask(() => console.log('2'));
  setTimeout(() => console.log('3'), 0);
  Promise.resolve().then(() => console.log('4'));
  console.log('5');
  
  // Answer: 5, 1, 2, 4, 3
  // Explanation: Sync (5), microtasks in order (1, 2, 4), macrotask (3).
  
  
  // Q32: What's the order?
  async function async1() {
    console.log('1');
    await async2();
    console.log('2');
  }
  async function async2() {
    console.log('3');
  }
  console.log('4');
  async1();
  console.log('5');
  
  // Answer: 4, 1, 3, 5, 2
  // Explanation: Sync (4), async1 runs (1), async2 runs (3), await pauses, sync (5), microtask (2).
  
  
  // Q33: What's the order?
  console.log('1');
  setTimeout(() => {
    console.log('2');
    Promise.resolve().then(() => console.log('3'));
  }, 0);
  Promise.resolve().then(() => {
    console.log('4');
    setTimeout(() => console.log('5'), 0);
  });
  console.log('6');
  
  // Answer: 1, 6, 4, 2, 3, 5
  // Explanation: Sync (1, 6), microtask (4, queues timeout), timeout (2, queues microtask 3), microtask (3), timeout (5).
  
  
  // Q34: What's the order?
  new Promise((resolve) => {
    console.log('1');
    resolve();
    console.log('2');
  }).then(() => console.log('3'));
  console.log('4');
  
  // Answer: 1, 2, 4, 3
  // Explanation: Promise executor is sync (1, 2), then sync (4), then microtask (3).
  
  
  // Q35: What's the order?
  setTimeout(() => console.log('1'), 0);
  Promise.resolve()
    .then(() => console.log('2'))
    .then(() => console.log('3'));
  Promise.resolve().then(() => console.log('4'));
  console.log('5');
  
  // Answer: 5, 2, 4, 3, 1
  // Explanation: Sync (5), microtasks (2, 4), chained microtask (3), timeout (1).
  
  
  // ==================== INSANE GENERATORS ====================
  
  // Q36: What will be the output?
  function* gen() {
    let x = yield 1;
    let y = yield (x + 1);
    return x + y;
  }
  const g = gen();
  console.log(g.next().value);
  console.log(g.next(10).value);
  console.log(g.next(20).value);
  
  // Answer: 1, 11, 30
  // Explanation: yield 1 (1). next(10): x=10, yield 11 (11). next(20): y=20, return 30 (30).
  
  
  // Q37: What will be the output?
  function* gen() {
    yield* [1, 2, 3];
    yield 4;
  }
  const g = gen();
  console.log(g.next().value);
  console.log(g.next().value);
  console.log(g.next().value);
  console.log(g.next().value);
  console.log(g.next().value);
  
  // Answer: 1, 2, 3, 4, undefined
  // Explanation: yield* delegates to array iterator. Yields 1, 2, 3, then 4, then done.
  
  
  // Q38: What will be the output?
  function* infinite() {
    let i = 0;
    while (true) {
      const reset = yield i++;
      if (reset) i = 0;
    }
  }
  const g = infinite();
  console.log(g.next().value);
  console.log(g.next().value);
  console.log(g.next(true).value);
  console.log(g.next().value);
  
  // Answer: 0, 1, 0, 1
  // Explanation: 0, 1, reset=true so i=0 (yields 0), 1.
  
  
  // Q39: What will be the output?
  function* gen1() {
    yield 1;
    yield 2;
  }
  function* gen2() {
    yield* gen1();
    yield 3;
  }
  const g = gen2();
  console.log(g.next().value);
  console.log(g.next().value);
  console.log(g.next().value);
  
  // Answer: 1, 2, 3
  // Explanation: yield* delegates to gen1, yielding 1, 2, then yields 3.
  
  
  // Q40: What will be the output?
  function* gen() {
    try {
      yield 1;
      yield 2;
    } catch (e) {
      console.log('Caught:', e);
    }
    yield 3;
  }
  const g = gen();
  console.log(g.next().value);
  g.throw('Error!');
  console.log(g.next().value);
  
  // Answer: 1, 'Caught: Error!', 3
  // Explanation: yield 1, throw caught, continues to yield 3.
  
  
  // ==================== BRUTAL ARRAY LOOPS ====================
  
  // Q41: What will be the output?
  const arr = [1, 2, 3];
  arr.forEach((val, i) => {
    if (i === 1) return;
    console.log(val);
  });
  
  // Answer: 1, 3
  // Explanation: return in forEach only skips current iteration, not entire loop.
  
  
  // Q42: What will be the output?
  const arr = [1, 2, 3];
  for (let i = 0; i < arr.length; i++) {
    setTimeout(() => console.log(arr[i]), 0);
  }
  
  // Answer: 1, 2, 3
  // Explanation: let creates block scope per iteration. Each timeout captures its own i.
  
  
  // Q43: What will be the output?
  const arr = [1, 2, 3, 4, 5];
  const result = arr.reduce((acc, val) => {
    if (val % 2 === 0) acc.push(val * 2);
    return acc;
  }, []);
  console.log(result);
  
  // Answer: [4, 8]
  // Explanation: Filters even numbers and doubles them. 2*2=4, 4*2=8.
  
  
  // Q44: What will be the output?
  const arr = [1, 2, 3];
  delete arr[1];
  arr.forEach(val => console.log(val));
  
  // Answer: 1, 3
  // Explanation: forEach skips empty slots created by delete.
  
  
  // Q45: What will be the output?
  const arr = new Array(3);
  arr.forEach(val => console.log('x'));
  arr.map(val => console.log('y'));
  
  // Answer: (nothing)
  // Explanation: forEach and map skip empty slots in sparse arrays.
  
  
  // Q46: What will be the output?
  const arr = [1, 2, 3];
  const mapped = arr.map(val => {
    arr.push(val + 10);
    return val * 2;
  });
  console.log(mapped);
  
  // Answer: [2, 4, 6]
  // Explanation: map iterates over original length (3) only, ignoring new pushes.
  
  
  // Q47: What will be the output?
  const arr = [1, 2, 3];
  for (const val of arr) {
    if (val === 2) break;
    console.log(val);
  }
  
  // Answer: 1
  // Explanation: break exits for...of loop. Only 1 is logged.
  
  
  // Q48: What will be the output?
  const arr = [1, 2, 3];
  const result = arr.flatMap(x => [x, x * 2]);
  console.log(result);
  
  // Answer: [1, 2, 2, 4, 3, 6]
  // Explanation: flatMap maps then flattens. Each x → [x, x*2], flattened.
  
  
  // Q49: What will be the output?
  const arr = [1, 2, 3];
  const result = arr.reduceRight((acc, val) => {
    acc.push(val);
    return acc;
  }, []);
  console.log(result);
  
  // Answer: [3, 2, 1]
  // Explanation: reduceRight processes right-to-left. Pushes in reverse order.
  
  
  // Q50: What will be the output?
  const arr = [1, [2, [3, [4]]]];
  console.log(arr.flat());
  console.log(arr.flat(2));
  console.log(arr.flat(Infinity));
  
  // Answer: [1, 2, [3, [4]]], [1, 2, 3, [4]], [1, 2, 3, 4]
  // Explanation: flat(n) flattens n levels deep. Infinity flattens completely.
  
  
  // ==================== TRICKY OBJECTS ====================
  
  // Q51: What will be the output?
  const a = {};
  const b = { key: 'b' };
  const c = { key: 'c' };
  a[b] = 123;
  a[c] = 456;
  console.log(a[b]);
  
  // Answer: 456
  // Explanation: Objects as keys convert to '[object Object]'. Both become same key.
  
  
  // Q52: What will be the output?
  const obj = { a: 1, b: 2, a: 3 };
  console.log(obj.a);
  
  // Answer: 3
  // Explanation: Duplicate keys: last value wins. obj.a = 3.
  
  
  // Q53: What will be the output?
  const obj = {
    a: 1,
    b: function() {
      console.log(this.a);
    }
  };
  const { b } = obj;
  b();
  
  // Answer: undefined
  // Explanation: Destructuring loses context. b() called without obj, this is undefined.
  
  
  // Q54: What will be the output?
  const obj = { x: 1 };
  const obj2 = Object.create(obj);
  obj2.x = 2;
  delete obj2.x;
  console.log(obj2.x);
  
  // Answer: 1
  // Explanation: delete removes own property. Prototype property (obj.x) still accessible.
  
  
  // Q55: What will be the output?
  const obj = { a: 1 };
  Object.seal(obj);
  obj.a = 2;
  obj.b = 3;
  delete obj.a;
  console.log(obj);
  
  // Answer: { a: 2 }
  // Explanation: seal allows modification but not add/delete. obj.a changed, b not added, a not deleted.
  
  
  // Q56: What will be the output?
  const obj = { a: 1 };
  Object.freeze(obj);
  obj.a = 2;
  console.log(obj.a);
  console.log(Object.isFrozen(obj));
  
  // Answer: 1, true
  // Explanation: freeze prevents modification. obj.a remains 1.
  
  
  // Q57: What will be the output?
  const obj = {
    *[Symbol.iterator]() {
      yield 1;
      yield 2;
      yield 3;
    }
  };
  console.log([...obj]);
  
  // Answer: [1, 2, 3]
  // Explanation: Custom iterator makes object iterable. Spread uses iterator.
  
  
  // Q58: What will be the output?
  const obj = { a: 1, b: 2, c: 3 };
  const { a, ...rest } = obj;
  console.log(rest);
  
  // Answer: { b: 2, c: 3 }
  // Explanation: Rest in destructuring collects remaining properties.
  
  
  // Q59: What will be the output?
  const target = { a: 1 };
  const handler = {
    get: () => 42
  };
  const proxy = new Proxy(target, handler);
  console.log(proxy.a);
  console.log(proxy.b);
  console.log(proxy.xyz);
  
  // Answer: 42, 42, 42
  // Explanation: Proxy handler's get always returns 42, ignoring property name.
  
  
  // Q60: What will be the output?
  const obj = { a: 1 };
  const descriptor = Object.getOwnPropertyDescriptor(obj, 'a');
  console.log(descriptor.writable);
  console.log(descriptor.enumerable);
  console.log(descriptor.configurable);
  
  // Answer: true, true, true
  // Explanation: Default property descriptor has all true for normal properties.
  
  
  // ==================== MIND-BENDING EDGE CASES ====================
  
  // Q61: What will be the output?
  console.log(0.1 + 0.2 === 0.3);
  
  // Answer: false
  // Explanation: Floating point precision issue. 0.1+0.2 = 0.30000000000000004.
  
  
  // Q62: What will be the output?
  console.log(Math.max());
  console.log(Math.min());
  
  // Answer: -Infinity, Infinity
  // Explanation: max() with no args is -Infinity. min() is Infinity.
  
  
  // Q63: What will be the output?
  console.log(1 / 0);
  console.log(-1 / 0);
  console.log(0 / 0);
  
  // Answer: Infinity, -Infinity, NaN
  // Explanation: Division by zero gives Infinity. 0/0 is indeterminate (NaN).
  
  
  // Q64: What will be the output?
  console.log(Infinity - Infinity);
  console.log(Infinity / Infinity);
  console.log(Infinity * 0);
  
  // Answer: NaN, NaN, NaN
  // Explanation: Indeterminate mathematical operations result in NaN.
  
  
  // Q65: What will be the output?
  const arr = [1, 2, 3];
  console.log(arr.length = 0);
  console.log(arr);
  
  // Answer: 0, []
  // Explanation: Setting length to 0 clears array. Assignment returns 0.
  
  
  // Q66: What will be the output?
  console.log([] instanceof Array);
  console.log([] instanceof Object);
  console.log(Array instanceof Object);
  
  // Answer: true, true, true
  // Explanation: Arrays are Arrays and Objects. Array constructor is an Object.
  
  
  // Q67: What will be the output?
  function test() {
    console.log(arguments instanceof Array);
    console.log(arguments instanceof Object);
    console.log(Array.isArray(arguments));
  }
  test(1, 2, 3);
  
  // Answer: false, true, false
  // Explanation: arguments is Array-like but not an Array. It's an Object.
  
  
  // Q68: What will be the output?
  const str = 'hello';
  str[0] = 'H';
  console.log(str);
  
  // Answer: 'hello'
  // Explanation: Strings are immutable. Assignment fails silently (or error in strict mode).
  
  
  // Q69: What will be the output?
  console.log(parseInt('10', 2));
  console.log(parseInt('10', 8));
  console.log(parseInt('10', 16));
  
  // Answer: 2, 8, 16
  // Explanation: parseInt with radix. Binary (2), Octal (8), Hex (16).
  
  
  // Q70: What will be the output?
  console.log(parseFloat('1.2.3'));
  console.log(parseInt('12px'));
  console.log(Number('12px'));
  
  // Answer: 1.2, 12, NaN
  // Explanation: parseFloat stops at invalid char (1.2). parseInt too (12). Number strict (NaN).
  
  
  // Q71: What will be the output?
  const x = new Number(10);
  const y = 10;
  console.log(x == y);
  console.log(x === y);
  console.log(typeof x);
  
  // Answer: true, false, 'object'
  // Explanation: == coerces wrapper object to primitive (true). === no coercion (false). typeof is 'object'.
  
  
  // Q72: What will be the output?
  console.log('5' + 3 - 2);
  console.log('5' - 3 + 2);
  
  // Answer: 51, 4
  // Explanation: '5'+3='53', '53'-2=51. '5'-3=2, 2+2=4. + concatenates, - coerces.
  
  
  // Q73: What will be the output?
  const obj = {
    valueOf: () => 42,
    toString: () => 'Hello'
  };
  console.log(obj + 1);
  console.log(String(obj));
  
  // Answer: 43, 'Hello'
  // Explanation: + uses valueOf (42+1). String() uses toString.
  
  
  // Q74: What will be the output?
  console.log([] + 1);
  console.log({} + 1);
  console.log(1 + {});
  
  // Answer: '1', '[object Object]1', '1[object Object]'
  // Explanation: []→'', ''+1='1'. {}→'[object Object]', concatenates.
  
  
  // Q75: What will be the output?
  const a = [1, 2, 3];
  const b = [1, 2, 3];
  console.log(a == b);
  console.log(a.toString() == b.toString());
  
  // Answer: false, true
  // Explanation: Arrays compared by reference (false). Strings compared by value (true).
  
  
  // Q76: What will be the output?
  console.log(undefined == null);
  console.log(undefined === null);
  console.log(undefined == 0);
  console.log(null == 0);
  
  // Answer: true, false, false, false
  // Explanation: undefined == null is special case (true). Neither equals 0 with ==.
  
  
  // Q77: What will be the output?
  const fn = new Function('a', 'b', 'return a + b');
  console.log(fn(2, 3));
  
  // Answer: 5
  // Explanation: Function constructor creates function from strings. 2+3=5.
  
  
  // Q78: What will be the output?
  console.log(isNaN('hello'));
  console.log(Number.isNaN('hello'));
  
  // Answer: true, false
  // Explanation: isNaN coerces to number (NaN), true. Number.isNaN strict, no coercion, false.
  
  
  // Q79: What will be the output?
  console.log(isFinite(Infinity));
  console.log(isFinite('123'));
  console.log(Number.isFinite('123'));
  
  // Answer: false, true, false
  // Explanation: isFinite coerces '123' to 123 (true). Number.isFinite strict (false).
  
  
  // Q80: What will be the output?
  const arr = Array(3).fill({});
  arr[0].x = 1;
  console.log(arr[1].x);
  
  // Answer: 1
  // Explanation: fill uses same object reference for all. All elements share same object.
  
  
  // ==================== ASYNC/AWAIT NIGHTMARES ====================
  
  // Q81: What will be the output?
  async function test() {
    return 42;
  }
  console.log(test());
  
  // Answer: Promise { 42 }
  // Explanation: async functions always return promises, even without explicit Promise.
  
  
  // Q82: What will be the output?
  async function test() {
    throw 'Error';
  }
  test()
    .then(val => console.log(val))
    .catch(err => console.log(err));
  
  // Answer: 'Error'
  // Explanation: throw in async function rejects promise. Caught by catch.
  
  
  // Q83: What's the order?
  async function test() {
    console.log('1');
    await Promise.resolve();
    console.log('2');
    await Promise.resolve();
    console.log('3');
  }
  test();
  console.log('4');
  
  // Answer: 1, 4, 2, 3
  // Explanation: Sync (1, 4), first await microtask (2), second await microtask (3).
  
  
  // Q84: What will be the output?
  async function test() {
    try {
      await Promise.reject('Error');
    } catch (e) {
      return e;
    }
  }
  test().then(val => console.log(val));
  
  // Answer: 'Error'
  // Explanation: Rejected promise caught, return creates resolved promise with 'Error'.
  
  
  // Q85: What will be the output?
  async function test() {
    const x = await 42;
    console.log(x);
  }
  test();
  
  // Answer: 42
  // Explanation: await non-promise wraps in resolved promise. x = 42.
  
  
  // Q86: What's the order?
  Promise.resolve().then(() => console.log('1'));
  (async () => console.log('2'))();
  console.log('3');
  
  // Answer: 2, 3, 1
  // Explanation: Async IIFE runs sync (2), sync (3), then microtask (1).
  
  
  // Q87: What will be the output?
  async function* asyncGen() {
    yield await Promise.resolve(1);
    yield await Promise.resolve(2);
  }
  (async () => {
    for await (let val of asyncGen()) {
      console.log(val);
    }
  })();
  
  // Answer: 1, 2
  // Explanation: Async generator yields resolved promise values.
  
  
  // Q88: What will be the output?
  const p1 = Promise.resolve(1);
  const p2 = 2;
  const p3 = Promise.resolve(3);
  Promise.all([p1, p2, p3]).then(vals => console.log(vals));
  
  // Answer: [1, 2, 3]
  // Explanation: Promise.all accepts non-promises too. Wraps them automatically.
  
  
  // Q89: What will be the output?
  Promise.resolve(1)
    .finally(() => console.log('Finally'))
    .then(val => console.log(val));
  
  // Answer: 'Finally', 1
  // Explanation: finally doesn't change resolved value. Runs then logs value.
  
  
  // Q90: What will be the output?
  Promise.reject('Error')
    .finally(() => console.log('Finally'))
    .catch(err => console.log(err

