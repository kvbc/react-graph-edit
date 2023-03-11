import { useRef, useState, useEffect } from 'react'
import './Slider.sass'
import Row from './GraphEdit/Row'

type Props = {
    children: React.ReactNode
    min: number
    max: number
    defaultValue: number
    value: number
    valueSuffix: string
    valuePrecision?: number
    onValueChange: (newValue: number) => void
}

function Slider ({ children, min, max, defaultValue, value, valueSuffix, onValueChange, valuePrecision = 0 }: Props) {
    const sliderRef = useRef<HTMLDivElement | null>(null)
    const sliderFillRef = useRef<HTMLDivElement | null>(null)
    const sliderHandleRef = useRef<HTMLDivElement | null>(null)
    const inputRef = useRef<HTMLInputElement | null>(null)

    const [inputValue, setInputValue] = useState<string>(String(defaultValue))
    const [isDraggingHandle, setIsDraggingHandle] = useState<boolean>(false)

    function setValue (newValue: number) {
        onValueChange(newValue)
    }

    useEffect(() => {
        function handleMouseDown (event: any) {
            if (inputRef.current === null)
                return
            if (sliderRef.current === null)
                return
            if (!sliderRef.current.contains(event.target))
                inputRef.current.blur() // unfocus
        }

        function handleMouseUp (event: any) {
            if (inputRef.current === null)
                return
            if (sliderRef.current === null)
                return
            if (!sliderRef.current.contains(event.target)) {
                let newValue = inputRef.current.valueAsNumber
                if (Number.isNaN(newValue) || (newValue < min) || (newValue > max))
                    newValue = defaultValue
                setValue(newValue)
            }
        }

        document.addEventListener("mouseup", handleMouseUp)
        document.addEventListener("mousedown", handleMouseDown)
        return () => {
            document.removeEventListener("mouseup", handleMouseUp)
            document.removeEventListener("mousedown", handleMouseDown)
        }
    }, [])

    useEffect(() => {
        setInputValue(value.toFixed(valuePrecision))

        if (sliderFillRef.current === null)
            return
        if (sliderHandleRef.current === null)
            return
        let fillPercentage = (value - min) / (max - min)
        sliderFillRef.current.style.setProperty("width", fillPercentage * 100 + "%")
        sliderHandleRef.current.style.setProperty("left", fillPercentage * 100 + "%")
    }, [value])

    function update (event: React.MouseEvent) {
        if (sliderRef.current === null)
            return
    
        let rect = sliderRef.current.getBoundingClientRect()
        let fillWidth = event.clientX - rect.left
        let fillPercentage = fillWidth / rect.width
        fillPercentage = Math.min(1, fillPercentage)
        fillPercentage = Math.max(0, fillPercentage)

        let newValue = (max - min) * fillPercentage + min
        setValue(newValue)
    }

    function handleMouseDown (event: React.MouseEvent) {
        event.preventDefault()
        if (event.button === 0) {
            setIsDraggingHandle(true)
            update(event)
        }
    }

    function handleMouseMove (event: React.MouseEvent) {
        if (isDraggingHandle)
            update(event)
    }

    function handleMouseUp (event: React.MouseEvent) {
        setIsDraggingHandle(false)
    }
    
    function handleMouseLeave (event: React.MouseEvent) {
        setIsDraggingHandle(false)
    }

    return <div
        onMouseLeave = {handleMouseLeave}
        onMouseUp = {handleMouseUp}
    >
        <Row>
            <div className="Slider__content">{children}</div>
            <input
                ref = {inputRef}
                className = "Slider__value"
                type = "number"
                placeholder = {min + ''}
                value = {inputValue}
                onChange = {e => setInputValue(e.currentTarget.value)}
            />
            <div className="Slider__valueSuffix">{valueSuffix}</div>
            <div
                ref = {sliderRef}
                className = "Slider__slider"
                onMouseMove = {handleMouseMove}
                onMouseDown = {handleMouseDown}
            >
                <div ref={sliderFillRef} className="Slider__slider__fill" />
                <div ref = {sliderHandleRef} className = "Slider__slider__handle"/>
            </div>
            <div className="Slider__max">{max}</div>
            <div className="Slider__valueSuffix">{valueSuffix}</div>
        </Row>
    </div>
}

export default Slider