import { useState, useRef, useEffect, useMemo } from 'react'
import './App.css'
import { Analytics } from "@vercel/analytics/react"
import { fieldImages } from './constants'
import type { Point } from './types'
import { NumberInput } from './components/NumberInput'
import { IconButton } from './components/IconButton'
import { SelectInput } from './components/SelectInput'
import { Checkbox } from './components/Checkbox'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [points, setPoints] = useState<Point[]>([])
  const [nextId, setNextId] = useState(0)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [fieldImageSrc, setFieldImageSrc] = useState<string>('h2h')
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [robotProgress, setRobotProgress] = useState<number>(0)
  const [hoveredPathProgress, setHoveredPathProgress] = useState<number | null>(null)
  const [lastHoveredProgress, setLastHoveredProgress] = useState<number>(0)
  const [botWidth, setBotWidth] = useState<number>(15)
  const [botLength, setBotLength] = useState<number>(15)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [showBot, setShowBot] = useState<boolean>(true)
  const [showArrows, setShowArrows] = useState<boolean>(true)
  const [showLines, setShowLines] = useState<boolean>(true)
  const [showGuideCoordinates, setShowGuideCoordinates] = useState<boolean>(true)

  // Helper to get the effective theta for a point
  // For non-last points: angle to next point
  // For last point: use stored theta value
  const getEffectiveTheta = (index: number): number => {
    if (index < points.length - 1) {
      // Calculate angle to next point in degrees
      const dx = points[index + 1].x - points[index].x
      const dy = points[index + 1].y - points[index].y
      // In canvas: positive Y is down. atan2(dy, dx) gives:
      // 0 = right, π/2 = down, π/-π = left, -π/2 = up
      // We want: 0 = up, 90 = right, 180 = down, 270 = left
      // So: theta = (atan2 + π/2) * 180/π, normalized to 0-360
      const radians = Math.atan2(dy, dx)
      let degrees = ((radians + Math.PI / 2) * 180) / Math.PI
      // Normalize to 0-360
      while (degrees < 0) degrees += 360
      while (degrees >= 360) degrees -= 360
      return degrees
    } else {
      // Last point uses stored theta
      return points[index].theta
    }
  }

  const generatedCodeLines = useMemo(() => {
    if (points.length === 0) return []
    const lines: { line: string; pointIndex: number | null }[] = []
    points.forEach((point, index) => {
      const x = Math.round(point.fieldX * 10) / 10
      const y = Math.round(point.fieldY * 10) / 10
      if (index === 0) {
        const theta = Math.round(getEffectiveTheta(0) * 10) / 10
        lines.push({ line: `chassis.setPose(${x}, ${y}, ${theta});`, pointIndex: index })
      } else {
        lines.push({ line: "\n", pointIndex: -1 })
        lines.push({ line: `chassis.turnToPoint(${x}, ${y}, 500, {.forwards=${point.forwards}, .maxSpeed=${point.speed}}, false);`, pointIndex: index })
        lines.push({ line: `chassis.moveToPoint(${x}, ${y}, ${point.timeout}, {.forwards=${point.forwards}, .maxSpeed=${point.speed}}, false);`, pointIndex: index })
      }
    })
    return lines
  }, [points])

  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)

  // points
  const POINT_RADIUS = 30
  const POINT_COLOR = '#00ff00a0'
  const POINT_BORDER_COLOR = '#ffffff80'
  const POINT_BORDER_WIDTH = 0
  const TEXT_COLOR = '#ffffff'
  // path line
  const LINE_COLOR = '#ff00ff80'
  const LINE_WIDTH = 5
  // robot
  const ROBOT_COLOR = '#ffffff30'
  const BOT_BORDER_COLOR = '#000000'
  const BOT_BORDER_WIDTH_IN = 0 // inches
  // arrows
  const ARROW_COLOR = '#FFFF00ff'
  // const ARROW_COLOR = '#00ffff80'
  const ARROW_THICKNESS_PX = 3
  const ARROW_HEAD_ANGLE = Math.PI / 6
  const ARROW_HEAD_LENGTH_IN = 2
  const ARROW_MAIN_LENGTH_IN = 6

  // Load the image
  useEffect(() => {
    // console.log('load image')
    const img = new Image()
    img.src = fieldImages[fieldImageSrc as keyof typeof fieldImages]
    img.onload = () => {
      setImage(img)
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = img.width
        canvas.height = img.height
      }
    }
  }, [fieldImageSrc])

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return


    // Draw background image
    ctx.drawImage(image, 0, 0)

    // Draw lines connecting points
    if (showLines && points.length > 1) {
      ctx.strokeStyle = LINE_COLOR
      ctx.lineWidth = LINE_WIDTH
      ctx.beginPath()
      // use fieldToPixelCoords to ensure lines connect the displayed centers
      const start = fieldToPixelCoords(points[0].fieldX, points[0].fieldY)
      ctx.moveTo(start.x, start.y)
      for (let i = 1; i < points.length; i++) {
        const pt = fieldToPixelCoords(points[i].fieldX, points[i].fieldY)
        ctx.lineTo(pt.x, pt.y)
      }
      ctx.stroke()
    }

    if (showGuideCoordinates) {
      const offset = 3;

      ctx.fillStyle = "#FFFF00"
      ctx.font = 'bold 40px Arial'
      ctx.textBaseline = 'middle'

      ctx.textAlign = 'center'
      ctx.fillText("(0, 0)", fieldToPixelCoords(0, 0).x, fieldToPixelCoords(0, 0).y)
      ctx.fillText("180°", fieldToPixelCoords(0, 0).x, fieldToPixelCoords(0, -72 + offset).y)
      ctx.fillText("0°", fieldToPixelCoords(0, 0).x, fieldToPixelCoords(0, 72 - offset).y)


      ctx.textAlign = 'left'
      ctx.fillText("(-72, 72)", fieldToPixelCoords(-72 + offset, 72).x, fieldToPixelCoords(-72, 72 - offset).y)
      ctx.fillText("(-72, -72)", fieldToPixelCoords(-72 + offset, -72).x, fieldToPixelCoords(-72, -72 + offset).y)
      ctx.fillText("270°", fieldToPixelCoords(-72 + offset, 0).x, fieldToPixelCoords(0, 0).y)

      ctx.textAlign = 'right'
      ctx.fillText("(72, 72)", fieldToPixelCoords(72 - offset, 72).x, fieldToPixelCoords(72, 72 - offset).y)
      ctx.fillText("(72, -72)", fieldToPixelCoords(72 - offset, -72).x, fieldToPixelCoords(72, -72 + offset).y)
      ctx.fillText("90°", fieldToPixelCoords(72 - offset, 0).x, fieldToPixelCoords(0, 0).y)

    }

    // Draw points (center at field coords)
    points.forEach((point, index) => {
      const isHovered = hoveredId === point.id
      const isSelected = selectedId === point.id

      const center = fieldToPixelCoords(point.fieldX, point.fieldY)

      ctx.fillStyle = POINT_COLOR
      ctx.beginPath()
      ctx.arc(center.x, center.y, POINT_RADIUS, 0, Math.PI * 2)
      ctx.fill()

      // Draw border (thicker for hover and white for selection)
      let borderWidth = POINT_BORDER_WIDTH
      let borderColor = POINT_BORDER_COLOR

      if (isSelected) {
        borderWidth = 4
        borderColor = '#FFFFFF'
      } else if (isHovered) {
        borderWidth = POINT_BORDER_WIDTH + 4
        borderColor = POINT_BORDER_COLOR
      }

      if (borderWidth > 0) {
        ctx.strokeStyle = borderColor
        ctx.lineWidth = borderWidth
        ctx.stroke()
      }

      // Draw index text
      ctx.fillStyle = TEXT_COLOR
      ctx.font = 'bold 40px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText((index).toString(), center.x, center.y)
    })

    // Draw exit-direction arrows at each point (pointing toward the next point)
    if (showArrows && points.length > 0) {
      const pixelsPerInch = image.width / 144
      const arrowLenInches = ARROW_MAIN_LENGTH_IN // arrow length in inches
      const arrowLen = arrowLenInches * pixelsPerInch

      for (let i = 0; i < points.length; i++) {
        const p = points[i]
        const center = fieldToPixelCoords(p.fieldX, p.fieldY)

        // determine exit direction: for last point use its theta; for others use angle to next point
        let angle = 0
        if (i < points.length - 1) {
          // Point to next point
          const next = points[i + 1]
          angle = Math.atan2(next.y - p.y, next.x - p.x)
        } else {
          // Last point: use stored theta value
          const thetaDeg = points[i].theta
          angle = (thetaDeg - 90) * (Math.PI / 180)
        }

        // Arrow starts from center of circle and extends outward
        const startX = center.x
        const startY = center.y
        const endX = startX + Math.cos(angle) * arrowLen
        const endY = startY + Math.sin(angle) * arrowLen

        // Check if the NEXT point is backwards - if so, reverse only the triangle at this point
        let arrowAngle = angle
        if (i < points.length - 1 && !points[i + 1].forwards) {
          arrowAngle = angle + Math.PI // Reverse triangle by 180 degrees
        }

        const headLenPx = ARROW_HEAD_LENGTH_IN * pixelsPerInch

        // Draw the line
        ctx.strokeStyle = ARROW_COLOR
        ctx.lineWidth = ARROW_THICKNESS_PX
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()

        // Draw the arrowhead with potentially reversed angle
        ctx.save()
        ctx.fillStyle = ARROW_COLOR
        ctx.beginPath()
        ctx.moveTo(endX, endY)
        ctx.lineTo(
          endX - headLenPx * Math.cos(arrowAngle - ARROW_HEAD_ANGLE),
          endY - headLenPx * Math.sin(arrowAngle - ARROW_HEAD_ANGLE)
        )
        ctx.lineTo(
          endX - headLenPx * Math.cos(arrowAngle + ARROW_HEAD_ANGLE),
          endY - headLenPx * Math.sin(arrowAngle + ARROW_HEAD_ANGLE)
        )
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
    }

    // Draw robot
    const displayProgress = hoveredPathProgress !== null ? hoveredPathProgress : !isRunning && lastHoveredProgress !== 0 ? lastHoveredProgress : robotProgress
    const robotData = getRobotPositionAndRotation(displayProgress)
    if (showBot && robotData && image) {
      const pixelsPerInch = image.width / 144
      const robotPixelWidth = botWidth * pixelsPerInch
      const robotPixelLength = botLength * pixelsPerInch

      ctx.save()
      ctx.fillStyle = ROBOT_COLOR
      ctx.translate(robotData.x, robotData.y)
      ctx.rotate(robotData.rotation)
      ctx.fillRect(
        -robotPixelLength / 2,
        -robotPixelWidth / 2,
        robotPixelLength,
        robotPixelWidth
      )

      // draw border inside the robot box
      const borderPx = BOT_BORDER_WIDTH_IN * pixelsPerInch
      if (borderPx > 0) {
        const inset = borderPx / 2
        ctx.lineWidth = borderPx
        ctx.strokeStyle = BOT_BORDER_COLOR
        ctx.strokeRect(
          -robotPixelLength / 2 + inset,
          -robotPixelWidth / 2 + inset,
          robotPixelLength - inset * 2,
          robotPixelWidth - inset * 2
        )
      }

      ctx.restore()

      // Draw robot front arrow (from center to front face)
      const frontX = robotData.x + Math.cos(robotData.rotation) * (robotPixelLength / 2)
      const frontY = robotData.y + Math.sin(robotData.rotation) * (robotPixelLength / 2)
      const robotHeadPx = ARROW_HEAD_LENGTH_IN * pixelsPerInch

      // Determine if robot is heading to a backwards point
      let arrowAngle = robotData.rotation
      if (points.length >= 2) {
        // Find which point the robot is heading towards based on progress
        let totalLength = 0
        const segmentLengths: number[] = []
        for (let i = 0; i < points.length - 1; i++) {
          const dx = points[i + 1].x - points[i].x
          const dy = points[i + 1].y - points[i].y
          const length = Math.sqrt(dx * dx + dy * dy)
          segmentLengths.push(length)
          totalLength += length
        }

        if (totalLength > 0) {
          const targetDistance = totalLength * displayProgress
          let currentDistance = 0

          for (let i = 0; i < segmentLengths.length; i++) {
            if (currentDistance + segmentLengths[i] >= targetDistance) {
              // Robot is on segment i, heading to points[i+1]
              if (!points[i + 1].forwards) {
                arrowAngle = robotData.rotation + Math.PI
              }
              break
            }
            currentDistance += segmentLengths[i]
          }
        }
      }

      // Draw the line
      ctx.strokeStyle = ARROW_COLOR
      ctx.lineWidth = ARROW_THICKNESS_PX
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(robotData.x, robotData.y)
      ctx.lineTo(frontX, frontY)
      ctx.stroke()

      // Draw the arrowhead at the end of the line
      ctx.save()
      ctx.fillStyle = ARROW_COLOR
      ctx.beginPath()
      ctx.moveTo(frontX, frontY)
      ctx.lineTo(
        frontX - robotHeadPx * Math.cos(arrowAngle - ARROW_HEAD_ANGLE),
        frontY - robotHeadPx * Math.sin(arrowAngle - ARROW_HEAD_ANGLE)
      )
      ctx.lineTo(
        frontX - robotHeadPx * Math.cos(arrowAngle + ARROW_HEAD_ANGLE),
        frontY - robotHeadPx * Math.sin(arrowAngle + ARROW_HEAD_ANGLE)
      )
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  }, [image, points, hoveredId, selectedId, robotProgress, hoveredPathProgress, lastHoveredProgress, botLength, botWidth, showBot, showLines, showArrows, isRunning, showGuideCoordinates])

  // Calculate total simulation duration from point timeouts
  const getTotalSimulationDuration = () => {
    if (points.length < 2) return 0
    // Sum all timeout values (they're in milliseconds)
    let totalMs = 0
    for (let i = 0; i < points.length - 1; i++) {
      totalMs += points[i + 1].timeout
    }
    return totalMs
  }

  // Get the progress along path based on time elapsed
  const getProgressFromElapsedTime = (elapsedMs: number) => {
    if (points.length < 2) return 0
    const totalMs = getTotalSimulationDuration()
    return totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 0
  }

  // Simulation loop: animate robotProgress from 0 -> 1 based on point timeouts
  useEffect(() => {
    if (!isRunning) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      lastTimeRef.current = null
      return
    }

    const totalMs = getTotalSimulationDuration()
    if (totalMs === 0) {
      setIsRunning(false)
      return
    }

    const startTime = performance.now()

    const step = (time: number) => {
      const elapsedMs = time - startTime
      const progress = getProgressFromElapsedTime(elapsedMs)

      setRobotProgress(progress)

      if (progress >= 1) {
        // stop when reached end and hide bot
        setIsRunning(false)
        setShowBot(false)
      } else {
        rafRef.current = requestAnimationFrame(step)
      }
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [isRunning, points])

  // Handle Delete key to remove selected point
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only delete when the canvas is focused to avoid removing points while typing in inputs
      const active = document.activeElement
      const canvasEl = canvasRef.current as HTMLCanvasElement | null
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedId !== null && active === canvasEl) {
        setPoints(points.filter(p => p.id !== selectedId))
        setSelectedId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, points])

  // Log points whenever they change
  useEffect(() => {
    console.log(points)
  }, [points])

  // Get canvas coordinates from mouse event
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Scale to canvas internal resolution
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: mouseX * scaleX,
      y: mouseY * scaleY
    }
  }

  // Convert pixel coordinates to field coordinates (144x144 inch field, centered at 0,0)
  const pixelToFieldCoords = (pixelX: number, pixelY: number) => {
    if (!image) return { fieldX: 0, fieldY: 0 }

    // Image is 2000x2000 pixels, but field area is 1932x1932 pixels (wall padding of 34px on each side)
    // The 1932x1932 field represents a 144x144 inch field
    const fieldPixelSize = 1932
    const fieldInchSize = 144
    const wallPadding = (image.width - fieldPixelSize) / 2

    const centerX = wallPadding + fieldPixelSize / 2
    const centerY = wallPadding + fieldPixelSize / 2
    const pixelsPerInch = fieldPixelSize / fieldInchSize

    const fieldX = (pixelX - centerX) / pixelsPerInch
    const fieldY = (centerY - pixelY) / pixelsPerInch // Invert Y because canvas Y increases downward

    return { fieldX, fieldY }
  }

  // Convert field coordinates back to pixel coordinates
  const fieldToPixelCoords = (fieldX: number, fieldY: number) => {
    if (!image) return { x: 0, y: 0 }

    // Image is 2000x2000 pixels, but field area is 1932x1932 pixels (wall padding of 34px on each side)
    // The 1932x1932 field represents a 144x144 inch field
    const fieldPixelSize = 1932
    const fieldInchSize = 144
    const wallPadding = (image.width - fieldPixelSize) / 2

    const centerX = wallPadding + fieldPixelSize / 2
    const centerY = wallPadding + fieldPixelSize / 2
    const pixelsPerInch = fieldPixelSize / fieldInchSize

    const x = fieldX * pixelsPerInch + centerX
    const y = centerY - fieldY * pixelsPerInch

    return { x, y }
  }

  // Update selected point's field coordinates
  const updateSelectedPointFieldCoords = (fieldX: number, fieldY: number) => {
    if (selectedId === null) return

    const { x, y } = fieldToPixelCoords(fieldX, fieldY)
    setPoints(points.map(p =>
      p.id === selectedId ? { ...p, x, y, fieldX, fieldY, theta: p.theta } : p
    ))
  }

  // Get robot position and rotation along the path
  const getRobotPositionAndRotation = (progress: number) => {
    if (points.length < 2) return null

    // Calculate total path length
    let totalLength = 0
    const segmentLengths: number[] = []

    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x
      const dy = points[i + 1].y - points[i].y
      const length = Math.sqrt(dx * dx + dy * dy)
      segmentLengths.push(length)
      totalLength += length
    }

    if (totalLength === 0) return null

    // Find position at progress (0 to 1)
    const targetDistance = totalLength * progress
    let currentDistance = 0

    for (let i = 0; i < segmentLengths.length; i++) {
      if (currentDistance + segmentLengths[i] >= targetDistance) {
        const segmentProgress = (targetDistance - currentDistance) / segmentLengths[i]
        const x = points[i].x + (points[i + 1].x - points[i].x) * segmentProgress
        const y = points[i].y + (points[i + 1].y - points[i].y) * segmentProgress

        // Calculate rotation (direction towards next point)
        const dx = points[i + 1].x - points[i].x
        const dy = points[i + 1].y - points[i].y
        const rotation = Math.atan2(dy, dx)

        return { x, y, rotation }
      }
      currentDistance += segmentLengths[i]
    }

    // At the end, use the last point's theta (converted from degrees to radians)
    // theta: 0=up, 90=right, 180=down, 270=left
    // In canvas: atan2(dy, dx) gives 0=right, π/2=down, ±π=left, -π/2=up
    // conversion: rotation = (theta - 90) * PI / 180
    const thetaDeg = points[points.length - 1].theta
    const rotation = (thetaDeg - 90) * (Math.PI / 180)
    return { x: points[points.length - 1].x, y: points[points.length - 1].y, rotation }
  }

  // Find closest point on path to mouse position
  const getClosestPointOnPath = (mouseX: number, mouseY: number) => {
    if (points.length < 2) return null

    let closestPoint = null
    let closestDistance = Infinity
    let closestProgress = 0

    // Check each segment
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]

      // Find closest point on line segment
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const lenSq = dx * dx + dy * dy

      let t = ((mouseX - p1.x) * dx + (mouseY - p1.y) * dy) / lenSq
      t = Math.max(0, Math.min(1, t))

      const closestX = p1.x + t * dx
      const closestY = p1.y + t * dy

      const distance = Math.hypot(mouseX - closestX, mouseY - closestY)

      if (distance < closestDistance) {
        closestDistance = distance
        closestPoint = { x: closestX, y: closestY }

        // Calculate progress along entire path
        let pathDistance = 0
        for (let j = 0; j < i; j++) {
          const segDx = points[j + 1].x - points[j].x
          const segDy = points[j + 1].y - points[j].y
          pathDistance += Math.sqrt(segDx * segDx + segDy * segDy)
        }
        pathDistance += t * Math.sqrt(lenSq)

        let totalDistance = 0
        for (let j = 0; j < points.length - 1; j++) {
          const segDx = points[j + 1].x - points[j].x
          const segDy = points[j + 1].y - points[j].y
          totalDistance += Math.sqrt(segDx * segDx + segDy * segDy)
        }

        closestProgress = totalDistance > 0 ? pathDistance / totalDistance : 0
      }
    }

    return closestDistance < 50 ? { point: closestPoint, progress: closestProgress } : null
  }

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e)

    // Check if clicking on existing point
    const clickedPoint = points.find(
      p => Math.hypot(p.x - x, p.y - y) < POINT_RADIUS
    )

    if (clickedPoint) {
      setSelectedId(clickedPoint.id)
    } else {
      const { fieldX, fieldY } = pixelToFieldCoords(x, y)

      // Round field coordinates to 2 decimal places and place the point
      const fieldXR = Math.round(fieldX * 10) / 10
      const fieldYR = Math.round(fieldY * 10) / 10

      // Convert back to pixel coordinates so the point is drawn exactly at the rounded field coords
      const { x: px, y: py } = fieldToPixelCoords(fieldXR, fieldYR)

      const newPoint: Point = {
        x: px,
        y: py,
        fieldX: fieldXR,
        fieldY: fieldYR,
        id: nextId,
        theta: 0,
        timeout: 1000,
        speed: 70,
        forwards: true
      }
      setPoints([...points, newPoint])
      setNextId(nextId + 1)
      setSelectedId(nextId)
      // focus the canvas so keyboard actions like Delete/Backspace only apply when canvas is focused
      if (canvasRef.current && typeof (canvasRef.current as HTMLCanvasElement).focus === 'function') {
        (canvasRef.current as HTMLCanvasElement).focus()
      }
    }
  }

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e)

    const clickedPoint = points.find(
      p => Math.hypot(p.x - x, p.y - y) < POINT_RADIUS
    )

    if (clickedPoint) {
      setDraggingId(clickedPoint.id)
    }
  }

  // Handle mouse move for dragging and hover detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e)

    // Check for hover on points
    const hoveredPoint = points.find(
      p => Math.hypot(p.x - x, p.y - y) < POINT_RADIUS
    )
    setHoveredId(hoveredPoint?.id ?? null)

    // Check for hover on path
    const pathHover = getClosestPointOnPath(x, y)
    setHoveredPathProgress(pathHover?.progress ?? null)
    if (pathHover?.progress !== null && pathHover?.progress !== undefined) {
      setLastHoveredProgress(pathHover.progress)
    }

    if (draggingId === null) return

    const { fieldX, fieldY } = pixelToFieldCoords(x, y)
    // Round to 2 decimal places
    const fieldXRounded = Math.round(fieldX * 10) / 10
    const fieldYRounded = Math.round(fieldY * 10) / 10
    setPoints(points.map(p =>
      p.id === draggingId ? { ...p, x, y, fieldX: fieldXRounded, fieldY: fieldYRounded, theta: p.theta } : p
    ))
  }

  // Handle mouse up for dragging
  const handleMouseUp = () => {
    setDraggingId(null)
  }

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredId(null)
    setHoveredPathProgress(null)
    setDraggingId(null)
  }

  const selectedPoint = selectedId !== null ? points.find(p => p.id === selectedId) : undefined

  // copy selected point code


  return (
    <>
      <Analytics />
      <div id="app">
        <div id="topnav">
          <h3>VEX V5RC Route Builder</h3>
          <button
            onClick={() => {
              const dataStr = JSON.stringify(points, null, 2)
              const dataBlob = new Blob([dataStr], { type: 'application/json' })
              const url = URL.createObjectURL(dataBlob)
              const link = document.createElement('a')
              link.href = url
              const now = new Date()
              const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
              link.download = `${dateStr}-v5rc-route.json`
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              URL.revokeObjectURL(url)
            }}
            style={{
              marginLeft: 'auto',
            }}
          >
            Download Route as JSON
          </button>
          <input
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            id="route-import-input"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const reader = new FileReader()
                reader.onload = (event) => {
                  try {
                    const importedPoints = JSON.parse(event.target?.result as string)
                    if (Array.isArray(importedPoints)) {
                      setPoints(importedPoints)
                      setSelectedId(null)
                      // Reset nextId to be higher than all imported ids
                      const maxId = Math.max(...importedPoints.map((p: Point) => p.id), -1)
                      setNextId(maxId + 1)
                    }
                  } catch (err) {
                    alert('Failed to parse JSON file')
                  }
                }
                reader.readAsText(file)
              }
            }}
          />
          <button
            onClick={() => {
              document.getElementById('route-import-input')?.click()
            }}
            style={{
              marginLeft: '0.5rem',
            }}
          >
            Import Route from JSON
          </button>
        </div>
        <div id="main">


          <div style={{ display: 'flex', flexDirection: 'column' }}>

            <div className="container" id="point-list">
              <h3>Points</h3>
              <div>
                {points.map((point, index) => (
                  <div
                    key={point.id}
                    className={`point-item ${selectedId === point.id ? 'selected' : ''}`}
                    onClick={() => setSelectedId(point.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span><strong>{point.id}.</strong></span>
                    <span>{Math.round(point.fieldX * 10) / 10}</span>
                    <span>{Math.round(point.fieldY * 10) / 10}</span>
                    <span>{Math.round(getEffectiveTheta(index) * 10) / 10}°</span>
                    <span>{point.timeout}ms</span>
                    <span>{point.forwards ? "Forwards" : "Backwards"}</span>
                    <span>Speed: {point.speed}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="container" id="code-preview">
              <h3>Code</h3>
              <pre style={{ backgroundColor: 'transparent', lineHeight: '1.5' }}>
                {generatedCodeLines.map((item, i) => {
                  const selectedPointIndex = selectedId !== null ? points.findIndex(p => p.id === selectedId) : -1
                  const isHighlighted = item.pointIndex === selectedPointIndex && selectedPointIndex !== -1
                  return (
                    <span
                      key={i}
                      onClick={() => {
                        if (item.pointIndex !== null) {
                          setSelectedId(points[item.pointIndex].id)
                        }
                      }}
                      style={{
                        backgroundColor: isHighlighted ? '#20408080' : 'transparent',
                        display: 'block',
                        borderRadius: '0.25rem',
                        cursor: item.pointIndex !== null ? 'pointer' : 'default',
                        padding: '0 0.25rem'
                      }}
                    >
                      {item.line}
                    </span>
                  )
                })}
              </pre>
            </div>
          </div>

          <div className="container" id="field">
            <canvas
              ref={canvasRef}
              tabIndex={0}
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: draggingId !== null ? 'grabbing' : hoveredId !== null ? 'grab' : 'crosshair' }}
              aria-label="VEX field canvas"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>

            <div id="configuration" className='container'>
              <h3>Configuration</h3>

              <SelectInput
                label="Field"
                value={fieldImageSrc}
                onChange={setFieldImageSrc}
                options={[
                  { value: "h2h", label: "Vex V5RC Push Back H2H" },
                  { value: "skills", label: "Vex V5RC Push Back Skills" }
                ]}
              />

              <div style={{ display: 'flex', gap: '1rem' }}>

                <NumberInput
                  label="Bot Length (in)"
                  value={botLength}
                  onChange={setBotLength}
                  min={1}
                  step={0.5}
                />
                <NumberInput
                  label="Bot Width (in)"
                  value={botWidth}
                  onChange={setBotWidth}
                  min={1}
                  step={0.5}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>



                <Checkbox
                  label="Show Bot"
                  checked={showBot}
                  iconSrc='/robot.svg'

                  onChange={(checked) => setShowBot(checked)}
                />
                <Checkbox
                  label="Show Lines"
                  checked={showLines}
                  iconSrc='/line.svg'
                  onChange={(checked) => setShowLines(checked)}
                />
                <Checkbox
                  label="Show Arrows"
                  iconSrc='/arrow-big-right.svg'
                  checked={showArrows}
                  onChange={(checked) => setShowArrows(checked)}
                />
                <Checkbox
                  label="Show Guide Coordinates"
                  iconSrc='/world.svg'
                  checked={showGuideCoordinates}
                  onChange={(checked) => setShowGuideCoordinates(checked)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <IconButton
                  onClick={() => {
                    setPoints(points.map(p => ({
                      ...p,
                      fieldY: -p.fieldY,
                      y: -p.y + (image ? image.height : 0)
                    })))
                  }}
                  iconSrc="/flip-horizontal.svg"
                  text="Flip X"
                />
                <IconButton
                  onClick={() => {
                    setPoints(points.map(p => ({
                      ...p,
                      fieldX: -p.fieldX,
                      x: -p.x + (image ? image.width : 0)
                    })))
                  }}
                  iconSrc="/flip-vertical.svg"
                  text="Flip Y"
                />
              </div>
            </div>
            <div className="container" id="edit">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Edit Point {selectedId !== null ? points.findIndex(p => p.id === selectedId) : ''}</h3>
                {
                  selectedId !== null && (
                    <div
                      style={{
                        marginLeft: "auto",
                        display: "flex",
                        gap: "0.5rem"
                      }}
                    >
                      <IconButton

                        onClick={() => {
                          const index = points.findIndex(p => p.id === selectedId);
                          setSelectedId(index > 0 ? index - 1 : points.length - 1);
                        }}
                        iconSrc="/arrow-left.svg"
                        text=""
                      />

                      <IconButton
                        onClick={() => {
                          const index = points.findIndex(p => p.id === selectedId);
                          setSelectedId(index < points.length - 1 ? index + 1 : 0);
                        }}
                        iconSrc="/arrow-right.svg"
                        text=""
                      />
                    </div>
                  )
                }








              </div>
              {selectedPoint && (
                <>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <NumberInput
                      label="X (in)"
                      value={selectedPoint.fieldX}
                      onChange={(v) => updateSelectedPointFieldCoords(v, selectedPoint.fieldY)}
                      step={1}
                      min={-72}
                    />
                    <NumberInput
                      label="Y (in)"
                      value={selectedPoint.fieldY}
                      onChange={(v) => updateSelectedPointFieldCoords(selectedPoint.fieldX, v)}
                      min={-72}
                      step={1}
                    />


                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>

                    <NumberInput
                      label="θ (°)"
                      value={Math.round(getEffectiveTheta(points.findIndex(p => p.id === selectedId)))}
                      onChange={(v) => {
                        const isLastPoint = selectedId !== null && selectedId === points[points.length - 1].id
                        if (isLastPoint) {
                          setPoints(points.map(p =>
                            p.id === selectedId ? { ...p, theta: v } : p
                          ))
                        }
                      }}
                      min={0}
                      max={360}
                      step={5}
                      disableButtons={selectedId !== null && selectedId !== points[points.length - 1].id}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <NumberInput
                      label="Timeout (ms)"
                      value={selectedPoint.timeout}
                      onChange={(v) => setPoints(points.map(p => p.id === selectedId ? { ...p, timeout: v } : p))}
                      min={0}
                      step={100}
                    />
                    <NumberInput
                      label="Speed (1-127)"
                      value={selectedPoint.speed}
                      onChange={(v) => setPoints(points.map(p => p.id === selectedId ? { ...p, speed: v } : p))}
                      min={1}
                      max={127}
                      step={5}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0rem' }}>
                    Direction
                    <div style={{ display: 'flex', gap: '0.5rem' }}>

                      <button
                        className={selectedPoint.forwards ? '' : 'selected'}
                        disabled={!selectedPoint.forwards}
                        onClick={() => setPoints(points.map(p => p.id === selectedId ? { ...p, forwards: false } : p))}
                      >
                        Backwards
                      </button>

                      <button
                        className={selectedPoint.forwards ? 'selected' : ''}
                        disabled={selectedPoint.forwards}
                        onClick={() => setPoints(points.map(p => p.id === selectedId ? { ...p, forwards: true } : p))}
                      >
                        Forwards
                      </button>

                    </div>

                  </div>

                </>
              )}
            </div>
            <div id="path-control" className='container'>
              <h3>Route</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                Progress: {(robotProgress * 100).toFixed(0)}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={robotProgress * 100}
                  onChange={(e) => setRobotProgress(parseFloat(e.target.value) / 100)}
                  step="1"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
                <button
                  onClick={() => {
                    if (!isRunning) {
                      // If at end, reset to start when running
                      if (robotProgress >= 1) setRobotProgress(0)
                      setIsRunning(true)
                      setShowBot(true)
                    } else {
                      setIsRunning(false)
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <img
                    src={isRunning ? '/player-pause.svg' : '/player-play.svg'}
                    alt={isRunning ? 'Pause' : 'Run'}
                    style={{ width: 18, height: 18, pointerEvents: 'none', filter: 'brightness(0) invert(0.95)' }}
                  />
                  {isRunning ? 'Pause' : 'Run'}
                </button>
              </div>
              {/* 
              <div style={{ marginTop: '0.5rem' }}>
              Total Time: 
                {(() => {
                  const totalMs = getTotalSimulationDuration()
                  const totalSeconds = totalMs / 1000
                  return ` ${totalSeconds.toFixed(1)}s`
                })()}
              </div> */}

            </div>

          </div>

        </div>
        <div id="footer">
          <div> &copy; 2026 </div>
          <a target='_blank' href="https://github.com/devinmd/vex-route-planner">Source Code</a>
          <div>by ASIJ's 901A</div>
        </div>
      </div>
    </>
  )
}

export default App
