interface CursorProps {
    blinking?: boolean;
}

function Cursor({
    blinking = false,
}: CursorProps) {

    return (
        <span
            className={
                blinking
                    ? "cursor blinking"
                    : "cursor"
            }
        >
            █
        </span>
    );

}

export default Cursor;