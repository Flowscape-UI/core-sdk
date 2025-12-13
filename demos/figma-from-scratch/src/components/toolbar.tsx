import { Button } from "./ui/button";
import { FaRegCircle } from "react-icons/fa";
import { FaRegSquare } from "react-icons/fa";
import { FaRegStar } from "react-icons/fa";
import { RxText } from "react-icons/rx";


export function Toolbar({
    onTextClick,
    onStarClick,
    onSquareClick,
    onCircleClick,
}:{
    onTextClick?: () => void;
    onStarClick?: () => void;
    onSquareClick?: () => void;
    onCircleClick?: () => void;
}) {
    return (
        <div className="fixed gap-2 px-1.5 py-5 bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center justify-between w-fit min-w-[64px] h-8 bg-[#2c2c2c] rounded-xl border border-[#3a3a3a] shadow-3xl">
            <Button onClick={onCircleClick} variant={"ghost"} className="size-8 text-white/40 rounded-md hover:!bg-white/5">
                <FaRegCircle />
            </Button>
            <Button onClick={onSquareClick} variant={"ghost"} className="size-8 text-white/40  rounded-md hover:!bg-white/5">
                <FaRegSquare />
            </Button>
            <Button onClick={onStarClick} variant={"ghost"} className="size-8 text-white/40  rounded-md hover:!bg-white/5">
                <FaRegStar />
            </Button>
            <Button onClick={onTextClick} variant={"ghost"} className="size-8 text-white/40  rounded-md hover:!bg-white/5">
                <RxText />
            </Button>
        </div>
    )
}