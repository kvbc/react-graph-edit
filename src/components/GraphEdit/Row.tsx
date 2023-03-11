import './Row.sass'

type Props = {
    children?: React.ReactNode
}

function Row ({ children }: Props) {
    return <div className="Row">
        {children}
    </div>
}

export default Row