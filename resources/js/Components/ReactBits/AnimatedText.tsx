import { motion } from "motion/react";


export default function AnimatedText({
    children
}:{
    children:string
}){

return (

<motion.h1

initial={{
    opacity:0,
    y:50
}}

animate={{
    opacity:1,
    y:0
}}

transition={{
    duration:1,
    ease:"easeOut"
}}

className="
text-6xl
md:text-7xl
font-black
leading-tight
"

>

{children}

</motion.h1>

)

}