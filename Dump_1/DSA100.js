function rotateArr(arr, d) {
    let n = arr.length;
  
    // Repeat the rotation d times
    for (let i = 0; i < d; i++) {
      
        // Left rotate the array by one position
        let first = arr[0];
        for (let j = 0; j < n - 1; j++) {
            arr[j] = arr[j + 1];
        }
        arr[n - 1] = first;
    }
    return arr
}

let arr = [1, 2, 3, 4, 5, 6];
let d = 2;

console.log(rotateArr(arr, d));