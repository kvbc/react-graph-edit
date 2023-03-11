/*
 * ---------------------------------------------------------------------------------------------
 *
 * The code was stolen from "regression"
 * 
 * npm    : https://www.npmjs.com/package/regression
 * github : https://github.com/Tom-Alexander/regression-js
 * file   : https://github.com/Tom-Alexander/regression-js/blob/master/src/regression.js
 * 
 * ---------------------------------------------------------------------------------------------
 * 
 * The MIT License (MIT)
 * 
 * Copyright (c) Tom Alexander <me@tomalexander.co.nz>
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 * ---------------------------------------------------------------------------------------------
 */

import MathUtils, { Vector2 } from '../../utils/MathUtils.ts'

type Coefficient = number

/**
* Determine the solution of a system of linear equations A * x = b using
* Gaussian elimination.
*
* @param {Array<Array<number>>} input - A 2-d matrix of data in row-major form [ A | b ]
* @param {number} order - How many degrees to solve for
*
* @return {Array<Coefficient>} - Vector of normalized solution coefficients matrix (x)
*/
function gaussianElimination(input: Array<Array<number>>, order: number): Array<Coefficient> {
    const matrix = input;
    const n = input.length - 1;
    const coefficients = [order];

    for (let i = 0; i < n; i++) {
        let maxrow = i;
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(matrix[i][j]) > Math.abs(matrix[i][maxrow])) {
                maxrow = j;
            }
        }

        for (let k = i; k < n + 1; k++) {
            const tmp = matrix[k][i];
            matrix[k][i] = matrix[k][maxrow];
            matrix[k][maxrow] = tmp;
        }

        for (let j = i + 1; j < n; j++) {
            for (let k = n; k >= i; k--) {
                matrix[k][j] -= (matrix[k][i] * matrix[i][j]) / matrix[i][i];
            }
        }
    }

    for (let j = n - 1; j >= 0; j--) {
        let total = 0;
        for (let k = j + 1; k < n; k++) {
            total += matrix[k][j] * coefficients[k];
        }

        coefficients[j] = (matrix[n][j] - total) / matrix[j][j];
    }

    return coefficients;
}

class PolynomialRegression {
    private _points: Array<Vector2>
    private _order: number
    private _coefficients: Array<Coefficient>
    private _targetCoefficients: Array<Coefficient>
    private _lerpWeight: number

    constructor (points: Array<Vector2>, order: number, lerpWeight: number) {
        this._points = []
        this._order = 0
        this._coefficients = []
        this._targetCoefficients = []
        this._lerpWeight = 0
        
        this.setOrder(order)
        this.setLerpWeight(lerpWeight)
        this.setPoints(points)
        this._coefficients = this._targetCoefficients
    }

    getLerpWeight (): number {
        return this._lerpWeight
    }

    getOrder (): number {
        return this._order
    }

    setOrder (order: number) {
        this._order = order
        this.setPoints(this._points) // force regression
    }

    setLerpWeight (lerpWeight: number) {
        console.assert(lerpWeight >= 0 && lerpWeight <= 1)
        this._lerpWeight = lerpWeight
    }

    setPoints (newPoints: Array<Vector2>) {
        this._points = newPoints

        let newCoefficients: Array<Coefficient> = []
        if (this._points.length > 0) {
            const lhs = [];
            const rhs = [];
            let a = 0;
            let b = 0;
            const len = this._points.length;
            const k = this._order + 1;
            
            for (let i = 0; i < k; i++) {
                for (let l = 0; l < len; l++)
                    if (this._points[l].y !== null)
                        a += (this._points[l].x ** i) * this._points[l].y;
            
                lhs.push(a);
                a = 0;
            
                const c = [];
                for (let j = 0; j < k; j++) {
                    for (let l = 0; l < len; l++)
                        if (this._points[l].y !== null)
                            b += this._points[l].x ** (i + j);
                    c.push(b);
                    b = 0;
                }
                rhs.push(c);
            }
            rhs.push(lhs);
            newCoefficients = gaussianElimination(rhs, k)
        }
        this._targetCoefficients = newCoefficients
    }

    update () {
        this._coefficients = this._targetCoefficients.map((targetCoeff, idx) => {
            if (idx >= this._coefficients.length)
                this._coefficients.push(targetCoeff)
            return MathUtils.lerp(this._coefficients[idx], targetCoeff, this._lerpWeight)
        })
    }

    predict (x: number): number {
        return this._coefficients.reduce((sum, coeff, power) => sum + (coeff * (x ** power)), 0)
    }

    toElement (): JSX.Element {
        let firstCoeff: number | null = null
        return <code>
            y =&nbsp;
            {this._targetCoefficients.map((_,i) => {
                const precision = 2
                i = this._targetCoefficients.length - 1 - i

                function wrapElement (coeff: number, el: JSX.Element): JSX.Element {
                    // FIXME
                    let wrapped = <span key={i}>
                        {(firstCoeff !== null) && (firstCoeff < 0) && <>&nbsp;</>}
                        {(firstCoeff !== null) && <>&nbsp;&nbsp;&nbsp;</>}
                        {(firstCoeff !== null) && (coeff >= 0) && <>&nbsp;</>}
                        {el}
                        <br />
                    </span>
                    if (firstCoeff === null)
                        firstCoeff = coeff
                    return wrapped
                }

                let coeff = Math.round(this._targetCoefficients[i] * 10**precision) / 10**precision
                if (coeff === 0)
                    return <></>

                let coeffFixed = coeff.toFixed(precision)
                if (i > 1)
                    return wrapElement(coeff, <>{coeffFixed}x<sup>{i}</sup> +</>)
                else if (i === 1)
                    return wrapElement(coeff, <>{coeffFixed}x +</>)
                
                return wrapElement(coeff, <>{coeffFixed}</>)
            })}
        </code>
    }
}

export default PolynomialRegression