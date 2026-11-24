import {initializeApp} from '@firebase/app';
import {getAuth} from '@firebase/auth';

const firebaseConfig={
 apiKey:'AIzaSyBtOMwuUgPZcWFAb8MAy0g7y6Bw-BsRvz4',
 authDomain:'renttitania.firebaseapp.com',
 projectId:'renttitania',
 storageBucket:'renttitania.firebasestorage.app',
 messagingSenderId:'156762531423',
 appId:'1:156762531423:web:58dda10fd9612823fc1dea'
};

const app=initializeApp(firebaseConfig);
export const firebaseAuth=getAuth(app);
