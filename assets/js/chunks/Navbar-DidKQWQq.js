import{j as e}from"./scanner-lib-CQfekM2j.js";import{R as s,u as t}from"./react-core-DFLHlFU9.js";import{g as a,S as o,U as l}from"./ui-components-btR2HY2Q.js";const c=({Icon:s,label:t,onClick:a})=>e.jsxs("button",{onClick:a,className:"flex flex-col items-center gap-0.5 w-16 active:opacity-60 transition-opacity",children:[e.jsx(s,{className:"w-6 h-6",strokeWidth:1.5}),e.jsx("span",{className:"text-[10px] font-medium",children:t})]}),i=s.memo((()=>{const s=t();return e.jsx("nav",{className:"fixed bottom-0 left-0 right-0 bg-yellow-50 border-t border-black",children:e.jsxs("div",{className:"flex justify-between items-center px-9 pb-[calc(env(safe-area-inset-bottom))]",children:[e.jsx(c,{Icon:a,label:"History",onClick:()=>s("/history")}),e.jsx("div",{className:"relative -top-7",children:e.jsx("button",{className:"flex flex-col items-center gap-0.5 bg-black text-yellow-50 p-5 rounded-full active:opacity-60 transition-opacity",onClick:()=>s("/scan"),children:e.jsx(o,{className:"w-10 h-10",strokeWidth:1.5})})}),e.jsx(c,{Icon:l,label:"Profile",onClick:()=>s("/user")})]})})}));export{i as default};