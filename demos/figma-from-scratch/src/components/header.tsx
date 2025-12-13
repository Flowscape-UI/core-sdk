import { Logo } from "@/assets/logo";
import { ThemeToggle } from "./ui/theme-toggle";

export function Header() {
    return (
        <header className='w-full h-16 bg-white dark:bg-black inline-flex items-center justify-between px-4 py-2'>
            <div className='inline-flex items-center gap-2'>
                <Logo className='size-10 rounded-full' />
                <span className='text-black dark:text-white text-2xl font-bold'>Flowscape UI</span>
            </div>

            <ThemeToggle />
        </header>
    )
}