import { useEffect, useCallback, useRef, useState } from 'react'

import Slider from '../Slider.tsx'
import PolynomialRegression from './PolynomialRegression.tsx'
import MathUtils, { Vector2, Axis } from '../../utils/MathUtils.ts'

import { RxStretchHorizontally } from 'react-icons/rx'
import { MdExpandMore, MdRadioButtonChecked } from 'react-icons/md'
import { TbTargetArrow } from 'react-icons/tb'
import { RiFontSize } from 'react-icons/ri'
import { BsSpeedometer2 } from 'react-icons/bs'
import { VscDebugRestart } from 'react-icons/vsc'

import './GraphEdit.sass'
import Row from './Row.tsx'

//
// TODO
// Make the types below be recognized not as aliases, but absolutely different and separate types,
// so the example below throws an error
//
// let x: WorldPosition = new Vector2(0, 0)
// let y: ScreenPosition = x // man...
//

type WorldPosition = Vector2
type WorldSize = Vector2

type ScreenPosition = Vector2
type ScreenSize = Vector2

type PointPosition = Vector2
type PointSize = Vector2

const CAMERA_DEFAULT_ZOOM = 0.25

class Camera {
    private _worldPosition: WorldPosition = new Vector2(0, 0)
    private _zoom: number = CAMERA_DEFAULT_ZOOM

    private _targetWorldPosition: WorldPosition = new Vector2(0, 0)
    private _targetZoom: number = this._zoom

    setX    (x: number)    { this._targetWorldPosition.x = x }
    setY    (y: number)    { this._targetWorldPosition.y = y }
    setZoom (zoom: number) { this._targetZoom = zoom }
    setPosition (worldPosition: WorldPosition) {
        // add like a lerp paramter for defautl reset
        this._targetWorldPosition.set(worldPosition)
    }

    getX    () { return this._worldPosition.x }
    getY    () { return this._worldPosition.y }
    getZoom () { return this._zoom }
    getPosition (): WorldPosition {
        return this._worldPosition
    }

    update () {        
        const lastWorldPosition = this._worldPosition.copy()
        const lastZoom = this._zoom

        this._worldPosition.set(this._targetWorldPosition)
        // this._zoom = MathUtils.lerp(this._zoom, this._targetZoom, 0.1)
        this._zoom = this._targetZoom

        if (this._worldPosition.equals(lastWorldPosition))
        if (this._zoom === lastZoom)
            return false
        return true
    }
}

type Props = {
    width: number
    height: number
}

function GraphEdit ({ width, height }: Props) {
    /*
     *
     * Constants
     * 
     */

    const PAN_SPEED = 3
    const ZOOM_SENSITIVITY = 0.001 
    const MAX_ZOOM = 3
    const MIN_ZOOM = 0.1

    const DEFAULT_POINT_SPACING = 300
    const DEFAULT_GRAPH_STEP = 10
    const DEFAULT_POINT_RADIUS = 40
    const DEFAULT_TEXT_SCALE = 10
    const DEFAULT_GRAPH_LERP_WEIGHT = 0.1
    const DEFAULT_GRAPH_POLYNOMIAL_ORDER = 5

    /*
     *
     * States
     *
     */

    const canvasRef = useRef<HTMLCanvasElement>(null)

    const [isPanning, setIsPanning] = useState<boolean>(false)
    const [draggedPoint, setDraggedPoint] = useState<Vector2 | null>(null)
    const [camera, setCamera] = useState<Camera>(new Camera())
    const [points, setPoints] = useState<Array<WorldPosition>>([ new Vector2(3,3), new Vector2(7,3), new Vector2(15,7) ])
    
    const [areSettingsExpanded, setAreSettingsExpanded] = useState<boolean>(false)
    const [pointSpacing, setPointSpacing] = useState<number>(DEFAULT_POINT_SPACING)
    const [graphStep, setGraphStep] = useState<number>(DEFAULT_GRAPH_STEP)
    const [pointRadius, setPointRadius] = useState<number>(DEFAULT_POINT_RADIUS)
    const [textScale, setTextScale] = useState<number>(DEFAULT_TEXT_SCALE)
    
    const [polynomialRegression, setPolynomialRegression] = useState<PolynomialRegression>(new PolynomialRegression([], DEFAULT_GRAPH_POLYNOMIAL_ORDER, DEFAULT_GRAPH_LERP_WEIGHT))
    
    const [graphLerpWeight, _setGraphLerpWeight] = useState<number>(DEFAULT_GRAPH_LERP_WEIGHT)
    function setGraphLerpWeight (newGraphLerpWeight: number) {
        _setGraphLerpWeight(newGraphLerpWeight)
        polynomialRegression.setLerpWeight(newGraphLerpWeight)
    }
    
    const [graphPolynomialOrder, _setGraphPolynomialOrder] = useState<number>(DEFAULT_GRAPH_POLYNOMIAL_ORDER)
    function setGraphPolynomialOrder (newGraphPolynomialOrder: number) {
        _setGraphPolynomialOrder(newGraphPolynomialOrder)
        polynomialRegression.setOrder(newGraphPolynomialOrder)
    }

    /*
     *
     * Effects
     * 
     */

    useEffect(() => {
        polynomialRegression.setPoints(points)
    }, [points])

    useEffect(() => {
        let stop = false
        function updateLoop () {
            if (stop)
                return
            polynomialRegression.update()
            camera.update()
            // if (camera.update())
                draw()
            window.requestAnimationFrame(updateLoop)
        }

        draw()
        updateLoop()

        return () => {
            stop = true
        }
    }, [points, pointSpacing, graphStep, pointRadius, textScale])

    /*
     *
     * Coordinate Systems :: Position
     * 
     */

    // Screen -> World
    // World  -> Screen
    function getScreenToWorldPosition (screenPosition: ScreenPosition, zoom: number = camera.getZoom()): WorldPosition {
        return new Vector2(
            camera.getX() + screenPosition.x / zoom,
            camera.getY() + screenPosition.y / zoom
        )
    }
    function getWorldToScreenPosition (worldPosition: WorldPosition): ScreenPosition {
        return new Vector2(
            (worldPosition.x - camera.getX()) * camera.getZoom(),
            (worldPosition.y - camera.getY()) * camera.getZoom()
        )
    }
    // Point -> World
    // World -> Point
    function getPointToWorldPosition (pointPosition: PointPosition): WorldPosition {
        return new Vector2(
            pointPosition.x * pointSpacing,
            pointPosition.y * pointSpacing
        )
    }
    function getWorldToPointPosition (worldPosition: WorldPosition): PointPosition {
        return new Vector2(
            worldPosition.x / pointSpacing,
            worldPosition.y / pointSpacing
        )
    }
    // Screen -> Point
    // Point  -> Screen
    function getScreenToPointPosition (screenPosition: ScreenPosition): PointPosition {
        return getWorldToPointPosition(getScreenToWorldPosition(screenPosition))
    }
    function getPointToScreenPosition (pointPosition: PointPosition): ScreenPosition {
        return getWorldToScreenPosition(getPointToWorldPosition(pointPosition))
    }
    // World -> Closest Point
    function getWorldToClosestPointPosition (worldPosition: WorldPosition): PointPosition {
        let pointPosition = getWorldToPointPosition(worldPosition)
        pointPosition.x = Math.round(pointPosition.x)
        pointPosition.y = Math.round(pointPosition.y)
        return pointPosition
    }

    /*
     *
     * Coordinate Systems :: Size
     * 
     */

    function getWorldToScreenSize (worldSize: WorldSize): ScreenSize { return getWorldToScreenPosition(camera.getPosition().add(worldSize)) }
    // function getScreenToWorldSize (screenSize: ScreenSize): WorldSize { return getScreenToWorldPosition(getWorldToScreenPosition(camera.getPosition()).add(screenSize)) }

    /*
     *
     * Helpers
     * 
     */

    function getFirstPointAtScreenPosition (screenPosition: ScreenPosition): PointPosition | null {
        let worldPosition = getScreenToWorldPosition(screenPosition)

        for (let point of points)
            if (worldPosition.distanceTo(getPointToWorldPosition(point)) <= pointRadius * 2)
                return point

        return null
    }

    /*
     *
     * Drawing
     * 
     */
    
    function draw () {
        if (canvasRef.current === null)
            return

        const context = canvasRef.current.getContext('2d') as CanvasRenderingContext2D

        function drawRect (
            screenPosition: ScreenPosition,
            screenSize: ScreenSize,
            color: string
        ) {
            context.fillStyle = color
            context.fillRect(
                screenPosition.x,
                screenPosition.y,
                screenSize.x,
                screenSize.y
            )
        }
    
        function drawText (
            screenPosition: ScreenPosition,
            text: string,
            color: string
        ) {
            let scale = textScale
            scale *= camera.getZoom()
            
            context.scale(scale, scale)
            context.fillStyle = color
            context.fillText(text,
                screenPosition.x / scale,
                screenPosition.y / scale
            )
            context.setTransform(1, 0, 0, 1, 0, 0);
        }
    
        function drawPoint (
            screenPosition: ScreenPosition,
            color: string
        ) {
            let screenRadius = getWorldToScreenSize(new Vector2(pointRadius, 0)).x

            context.fillStyle = color
            context.beginPath()
            context.ellipse(
                screenPosition.x,
                screenPosition.y,
                screenRadius, screenRadius,
                0, 0, Math.PI * 2
            )
            context.fill()
            context.closePath()
        }
    
        function drawAxes (
            axisWidth: number,
            valueSpacing: WorldSize,
            pointSize: WorldSize
        ) {
            drawRect(
                new Vector2(getWorldToScreenPosition(new Vector2(0 - axisWidth / 2, 0)).x, 0),
                new Vector2(getWorldToScreenSize(new Vector2(axisWidth, 0)).x, height),
                "gray"
            )
            drawRect(
                new Vector2(0, getWorldToScreenPosition(new Vector2(0, 0 - axisWidth / 2)).y),
                new Vector2(width, getWorldToScreenSize(new Vector2(0, axisWidth)).y),
                "gray"
            )
    
            context.beginPath()
    
            for (let axis of [Axis.X, Axis.Y]) {
                let startPointPosition = getWorldToClosestPointPosition(camera.getPosition())
                let endPointPosition = getWorldToClosestPointPosition(getScreenToWorldPosition(new Vector2(width, height)))
    
                if (axis === Axis.X) {
                    startPointPosition.y = 0
                    endPointPosition.y = 0
                }
                else {
                    startPointPosition.x = 0
                    endPointPosition.x = 0
                }
    
                for (
                    let pointPosition = startPointPosition;
                    pointPosition.get(axis) <= endPointPosition.get(axis);
                    (axis === Axis.X) ? pointPosition.x++ : pointPosition.y++
                ) {
                    let worldPosition = getPointToWorldPosition(pointPosition)
                    if (worldPosition.x === 0)
                    if (worldPosition.y === 0)
                        continue
                        
                    let worldSize = pointSize.copy()
                    if (axis === Axis.Y)
                        worldSize.flip()
    
                    // Grid
                    {
                        let screenPosition = getWorldToScreenPosition(worldPosition)
                        if (axis === Axis.X) {
                            context.moveTo(screenPosition.x, 0)
                            context.lineTo(screenPosition.x, height)
                        }
                        else {
                            context.moveTo(0, screenPosition.y)
                            context.lineTo(width, screenPosition.y)
                        }
                    }
    
                    drawRect(
                        getWorldToScreenPosition(worldPosition.sub(worldSize.div(2))),
                        getWorldToScreenSize(worldSize),
                        "gray"
                    )
    
                    // Text
                    {
                        let value = valueSpacing.get(axis) * pointPosition.get(axis)
                        if (axis === Axis.Y)
                            value = -value
                        const text = String(value)
                        const textMetrics = context.measureText(text)
                        const textWidth = textMetrics.width * textScale
                        const textHeight = (textMetrics.actualBoundingBoxAscent - textMetrics.actualBoundingBoxDescent) * textScale
    
                        let textX = worldPosition.x
                        let textY = worldPosition.y
                        const textPadding = 10
                        if (axis === Axis.X) {
                            textX -= textWidth / 2
                            textY += worldSize.y / 2
                            textY += textHeight
                            textY += textPadding
                        }
                        else {
                            textX -= worldSize.x / 2
                            textX -= textWidth
                            textX -= textPadding
                            textY += textHeight / 2
                        }
    
                        drawText(
                            getWorldToScreenPosition(new Vector2(textX, textY)),
                            text,
                            "black"
                        )
                    }
                }
            }
            
            context.strokeStyle = "lightgray"
            context.stroke()
            context.closePath()
        }

        function drawGraph () {
            context.beginPath()

            for (
                let worldX = getScreenToWorldPosition(new Vector2(0, 0)).x,
                    firstIter = true;
                worldX <= getScreenToWorldPosition(new Vector2(width, 0)).x;
                worldX += graphStep
            ) {
                let worldY = polynomialRegression.predict(worldX / pointSpacing) * pointSpacing
                //
                // worldY = -worldY
                //
                let worldPosition = new Vector2(worldX, worldY)
                let screenPosition = getWorldToScreenPosition(worldPosition)
                if (firstIter) {
                    context.moveTo(screenPosition.x, screenPosition.y)
                    firstIter = false
                    continue
                }
                context.lineTo(screenPosition.x, screenPosition.y)
            }

            context.strokeStyle = "red"
            context.stroke()
            context.closePath()
        }

        drawRect(
            new Vector2(0, 0),
            new Vector2(width, height),
            "white"
        )

        drawAxes(
            10,
            new Vector2(1, 1),
            new Vector2(10, 50)
        )

        for (let point of points)
            drawPoint(
                getPointToScreenPosition(point),
                "red"
            )

        drawGraph()
    }

    /*
     *
     * Canvas Handlers
     * 
     */

    function getMouseScreenPosition (event: React.MouseEvent): ScreenPosition {
        let rect = canvasRef.current?.getBoundingClientRect() as DOMRect
        return new Vector2(
            (event.clientX - rect.left) / (rect.right  - rect.left) * width,
            (event.clientY - rect.top)  / (rect.bottom - rect.top)  * height
        )
    }

    function handleMouseDown (event: React.MouseEvent) {
        event.preventDefault()
        
        if (event.button !== 1) { // not MMB
            let mouseScreenPosition = getMouseScreenPosition(event)
            let pointPosition = getFirstPointAtScreenPosition(mouseScreenPosition)
            if (pointPosition === null) {
                if (event.button === 2) // RMB
                    setPoints(points.concat([ getScreenToPointPosition(mouseScreenPosition) ]))
            }
            else {
                if (event.button === 0) // LMB
                    setDraggedPoint(pointPosition)
                else // RMB
                    setPoints(points.filter(p => p !== pointPosition))
                return
            }
        }

        setIsPanning(true)
    }

    function handleMouseMove (event: React.MouseEvent) {
        if (draggedPoint != null) {
            let mouseScreenPosition = getMouseScreenPosition(event)
            let mousePointPosition = getScreenToPointPosition(mouseScreenPosition)
            setPoints(points.map(point => point === draggedPoint ? mousePointPosition : point))
            setDraggedPoint(mousePointPosition)
        }

        if (isPanning) {
            camera.setX(camera.getX() - event.movementX * PAN_SPEED / camera.getZoom()),
            camera.setY(camera.getY() - event.movementY * PAN_SPEED / camera.getZoom())
        }
    }

    function handleMouseUp (event: React.MouseEvent) {
        event.preventDefault()
        setIsPanning(false)
        setDraggedPoint(null)
    }

    // FIXME
    function handleWheel (event: React.WheelEvent) {
        let newZoom = camera.getZoom() - event.deltaY * ZOOM_SENSITIVITY
        newZoom = Math.min(newZoom, MAX_ZOOM)
        newZoom = Math.max(newZoom, MIN_ZOOM)
        if (newZoom === MIN_ZOOM || newZoom === MAX_ZOOM)
            return
        
        let mouseScreenPosition = getMouseScreenPosition(event)
        let mouseWorldPosition = getScreenToWorldPosition(mouseScreenPosition)
        let nextMouseWorldPosition = getScreenToWorldPosition(mouseScreenPosition, newZoom)
        let dx = nextMouseWorldPosition.x - mouseWorldPosition.x
        let dy = nextMouseWorldPosition.y - mouseWorldPosition.y
        camera.setZoom(newZoom)
        camera.setX(camera.getX() - dx)
        camera.setY(camera.getY() - dy)
    }

    function handleMouseLeave () {
        setIsPanning(false)
        setDraggedPoint(null)
    }

    /*
     *
     * UI Handlers
     * 
     */

    function handleUIExpandMouseDown () {
        setAreSettingsExpanded(!areSettingsExpanded)
    }

    function handleUIResetMouseDown () {
        camera.setPosition(new Vector2(0, 0))
        camera.setZoom(CAMERA_DEFAULT_ZOOM)
        setPointSpacing(DEFAULT_POINT_SPACING)
        setGraphStep(DEFAULT_GRAPH_STEP)
        setPointRadius(DEFAULT_POINT_RADIUS)
        setTextScale(DEFAULT_TEXT_SCALE)
        setGraphLerpWeight(DEFAULT_GRAPH_LERP_WEIGHT)
        setGraphPolynomialOrder(DEFAULT_GRAPH_POLYNOMIAL_ORDER)
    }

    /*
     *
     * Render
     * 
     */
    
    let expandIconClassName = "GraphEdit__expand"
    if (areSettingsExpanded)
        expandIconClassName += " GraphEdit__expand--expanded"

    let graphEditSettingsClassName = "GraphEdit__settings"
    if (areSettingsExpanded)
        graphEditSettingsClassName += " GraphEdit__settings--expanded"

    return <div className="GraphEdit" onContextMenu={e => e.preventDefault()}>
        <MdExpandMore className={expandIconClassName} onMouseDown={handleUIExpandMouseDown} />
        <div className={"GraphEdit__settings__topbar" + (areSettingsExpanded ? " GraphEdit__settings__topbar--expanded" : "")}>
            <button onMouseDown={handleUIResetMouseDown}>
                <VscDebugRestart />
            </button>
        </div>
        <div className={graphEditSettingsClassName}>
            <Slider
                min = {100}
                max = {500}
                value = {pointSpacing}
                defaultValue = {DEFAULT_POINT_SPACING}
                valueSuffix = "px"
                onValueChange = {newPointSpacing => setPointSpacing(newPointSpacing)}
            >
                <RxStretchHorizontally title="Point Spacing" />
            </Slider>
            <Slider
                min = {1}
                max = {200}
                value = {graphStep}
                defaultValue = {DEFAULT_GRAPH_STEP}
                valueSuffix = "px"
                onValueChange = {newGraphStep => setGraphStep(newGraphStep)}
            >
                <TbTargetArrow title="Graph Step/Accuracy" />
            </Slider>
            <Slider
                min = {5}
                max = {100}
                value = {pointRadius}
                defaultValue = {DEFAULT_POINT_RADIUS}
                valueSuffix = "px"
                onValueChange = {newPointRadius => setPointRadius(newPointRadius)}
            >
                <MdRadioButtonChecked title="Point Radius" />
            </Slider>
            <Slider
                min = {3}
                max = {20}
                value = {textScale}
                defaultValue = {DEFAULT_TEXT_SCALE}
                valueSuffix = "rem"
                onValueChange = {newTextScale => setTextScale(newTextScale)}
            >
                <RiFontSize title="Font Size" />
            </Slider>
            <Slider
                min = {0}
                max = {1}
                value = {graphLerpWeight}
                defaultValue = {DEFAULT_GRAPH_LERP_WEIGHT}
                valueSuffix = "w"
                onValueChange = {newLerpWeight => setGraphLerpWeight(newLerpWeight)}
                valuePrecision = {2}
            >
                <BsSpeedometer2 title="Graph Interpolation Speed/Weight" />
            </Slider>
            <Slider
                min = {1}
                max = {20}
                value = {graphPolynomialOrder}
                defaultValue = {DEFAULT_GRAPH_POLYNOMIAL_ORDER}
                valueSuffix = "n"
                onValueChange = {newOrder => setGraphPolynomialOrder(newOrder)}
            >
                <div title="Polynomial Order">x<sup>n</sup></div>
            </Slider>
            <Row>
                { polynomialRegression.toElement() }
            </Row>
        </div>
        <canvas
            ref = {canvasRef}
            width = {width}
            height = {height}
            onMouseDown = {handleMouseDown}
            onMouseUp = {handleMouseUp}
            onMouseMove = {handleMouseMove}
            onWheel = {handleWheel}
            onMouseLeave = {handleMouseLeave}
        />
    </div>
}

export default GraphEdit