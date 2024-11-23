import { atom } from 'recoil';

const userAtom = atom({
    key:"userAtom",
    default:{
        name:'',
        email:'',
        password:'',
        age:'',
    }
})
export default userAtom;