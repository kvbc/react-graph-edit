export enum Axis {
    X,
    Y
}

export class Vector2 {
    x: number = 0.0
    y: number = 0.0

    constructor (x: number, y: number) {
        this.x = x
        this.y = y
    }

    get (axis: Axis): number {
        return (axis === Axis.X) ? this.x : this.y
    }

    set (other: Vector2) {
        this.x = other.x
        this.y = other.y
    }

    // FIXME
    equals (other: Vector2) {
        return (this.x === other.x) && (this.y === other.y)
    }

    copy (): Vector2 {
        return new Vector2(this.x, this.y)
    }

    flip () {
        [this.x, this.y] = [this.y, this.x]
    }

    distanceTo (other: Vector2): number {
        return Math.sqrt((this.x - other.x)**2 + (this.y - other.y)**2)
    }

    add (other: Vector2): Vector2 {
        return new Vector2(
            this.x + other.x,
            this.y + other.y
        )
    }

    sub (other: Vector2): Vector2 {
        return new Vector2(
            this.x - other.x,
            this.y - other.y
        )
    }

    div (other: Vector2 | number): Vector2 {
        if (typeof other === 'number')
            return new Vector2(
                this.x / other,
                this.y / other
            )
        return new Vector2(
            this.x / other.x,
            this.y / other.y
        )
    }
}

function lerp (start: number, end: number, weight: number): number {
    let value = start * (1.0 - weight) + end * weight
    // FIXME
    if (Number.isNaN(value) || !Number.isFinite(value))
        return end
    return value
}

export default {
    lerp
}