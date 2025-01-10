
//Linear interpolation
export const lerp = function( a, b, t ) {
  return a + t * ( b - a ) 
}

//Returns the position of a point at `angle` on a circle of `radius` centered on `center`
export const positionOnCircle = function( center, radius, angle ) {
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle)
  }
}

//Returns a random integer in [min;max[
export const randomBetween = function( min, max ) {
  return Math.floor(Math.random() * (max-min)) + min
}

export const randomPointInArea = function(area) {
  return {
    x: randomBetween(area.x, area.x + area.width),
    y: randomBetween(area.y, area.y + area.height)
  }
}

//-4x²+4x a parabola that peaks at one half
//Starts at 0, rises to 1 when x=0.5, goes down to 0 when x=1
//https://www.google.com/search?q=plot+-4x2%2B4x
export const peakAtHalf = function( x ) {
  return -4*(x*x) + 4*x
}

export const clampPointToArea = function(point, area) {
  if (point.x < 0) {
    point.x = area.x
  }
  if (point.y < 0) {
    point.y = area.y
  }
  if (point.x > area.width) {
    point.x = area.width
  }
  if (point.y > area.height) {
    point.y = area.height
  }
  return point
}