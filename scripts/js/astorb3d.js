// astorb3d.js
// astorb3d
// by John W. Shaffstall
// Tuesday, October 16, 2013

(function() {
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    window.requestAnimationFrame = requestAnimationFrame;
})();

var astorb = astorb || {};

// Resize canvas drawing buffer + viewport to match CSS size.
astorb.resizeWebGL = function()
{
    var canvas = astorb.canvas;
    var gl = astorb.gl;
    if (!canvas || !gl) return;

    // Use CSS pixels from layout.
    var displayWidth = canvas.clientWidth;
    var displayHeight = canvas.clientHeight;

    // Fall back for older browsers.
    if (!displayWidth || !displayHeight)
    {
        displayWidth = canvas.offsetWidth;
        displayHeight = canvas.offsetHeight;
    }

    // Convert to device pixels for crisp rendering.
    var dpr = window.devicePixelRatio || 1;
    var width = Math.max(1, Math.floor(displayWidth * dpr));
    var height = Math.max(1, Math.floor(displayHeight * dpr));

    if (canvas.width !== width || canvas.height !== height)
    {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);

        // Update projection matrix to match new aspect ratio.
        if (astorb.pUniform)
        {
            astorb.updateProjectionMatrix();
        }
    }
};

astorb.updateProjectionMatrix = function()
{
    var gl = astorb.gl;
    var canvas = astorb.canvas;
    if (!gl || !canvas || !astorb.pUniform) return;

    var aspectRatio = canvas.width / Math.max(1, canvas.height);

    var perspectiveMatrix = mat4.create();
    var cameraFieldOfViewRadians = Math.PI / 3; // 60 degree FOV
    var nearPlaneAU = 0.005;
    var farPlaneAU = 300.0;
    mat4.perspective(perspectiveMatrix, cameraFieldOfViewRadians, aspectRatio, nearPlaneAU, farPlaneAU);

    gl.uniformMatrix4fv(astorb.pUniform, false, perspectiveMatrix);
};

astorb.logDivId = "astorbLog";
astorb.logDiv = document.getElementById(astorb.logDivId);
astorb.log = function(message, color)
{
    var color = color || "black";
    var message = "" + message;

    if (console && console.log)
    {
        console.log(message);
    }

    var logDiv = astorb.logDiv;
    if (logDiv)
    {
        var coloredMessage = message.fontcolor(color);
        logDiv.innerHTML = "" + coloredMessage + "</br>" + logDiv.innerHTML;
    }
};

astorb.log("astorb3d.js", "black");
astorb.log("by John W. Shaffstall", "black");

astorb.canvasId = "astorb3dCanvas";
astorb.onLoadBody = function()
{
    var canvas = document.getElementById(astorb.canvasId);
    if (canvas)
    {
        var gl = null;

        try
        {
            gl = canvas.getContext("webgl", {antialias:false})
                || canvas.getContext("experimental-webgl", {antialias:false});
            var initWebGLSuccess = astorb.initWebGL(gl, canvas);
            if (initWebGLSuccess)
            {
                // Keep WebGL sized to the CSS layout.
                astorb.resizeWebGL();

                if (typeof ResizeObserver !== 'undefined')
                {
                    astorb._resizeObserver = new ResizeObserver(function() {
                        astorb.resizeWebGL();
                    });
                    astorb._resizeObserver.observe(canvas);
                }
                else
                {
                    window.addEventListener('resize', astorb.resizeWebGL);
                }

                astorb.loadAstorbData();
            }
        }
        catch(exception)
        {
            astorb.log(exception, "yellow");
        }
    }
    else
    {
        astorb.log("unable to find canvas element with id '"+ astorb.canvasId +"'");
    }
};

astorb.initWebGL = function(gl, canvas)
{
    var success = false;
    astorb.gl = gl;
    astorb.canvas = canvas;
    if (gl && canvas)
    {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.disable(gl.DEPTH_TEST);
        // gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Size from layout.
        astorb.resizeWebGL();

        astorb.initShaders(gl);
        astorb.initBuffers(gl);

        success = true;
    }
    else
    {
        astorb.log("invalid WebGL context", "red");
    }

    return success;
};

astorb.initShaders = function(gl)
{
    var fragmentShader = astorb.getShader(gl, "shader-fs");
    var vertexShader = astorb.getShader(gl, "shader-vs");

    // create the shader program

    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // if creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
    {
        astorb.log("Unable to initialize the shader program: " + gl.getProgramInfoLog(shaderProgram), "red");
    }

    gl.useProgram(shaderProgram);
    astorb.shaderProgram = shaderProgram;

    var aSemimajorAxis = gl.getAttribLocation(shaderProgram, "aSemimajorAxis");
    var aEccentricity = gl.getAttribLocation(shaderProgram, "aEccentricity");
    var aInclination = gl.getAttribLocation(shaderProgram, "aInclination");
    var aArgumentOfPerihelion = gl.getAttribLocation(shaderProgram, "aArgumentOfPerihelion");
    var aLongitudeOfAscendingNode = gl.getAttribLocation(shaderProgram, "aLongitudeOfAscendingNode");
    var aMeanAnomaly = gl.getAttribLocation(shaderProgram, "aMeanAnomaly");

    astorb.log("Attribute locations: a=" + aSemimajorAxis + " e=" + aEccentricity +
               " i=" + aInclination + " w=" + aArgumentOfPerihelion +
               " O=" + aLongitudeOfAscendingNode + " M=" + aMeanAnomaly, "blue");

    // Only enable valid attribute arrays (location >= 0)
    if (aSemimajorAxis >= 0) gl.enableVertexAttribArray(aSemimajorAxis);
    if (aEccentricity >= 0) gl.enableVertexAttribArray(aEccentricity);
    if (aInclination >= 0) gl.enableVertexAttribArray(aInclination);
    if (aArgumentOfPerihelion >= 0) gl.enableVertexAttribArray(aArgumentOfPerihelion);
    if (aLongitudeOfAscendingNode >= 0) gl.enableVertexAttribArray(aLongitudeOfAscendingNode);
    if (aMeanAnomaly >= 0) gl.enableVertexAttribArray(aMeanAnomaly);

    astorb.aSemimajorAxis = aSemimajorAxis;
    astorb.aEccentricity = aEccentricity;
    astorb.aInclination = aInclination;
    astorb.aArgumentOfPerihelion = aArgumentOfPerihelion;
    astorb.aLongitudeOfAscendingNode = aLongitudeOfAscendingNode;
    astorb.aMeanAnomaly = aMeanAnomaly;
};

astorb.getShader = function(gl, shaderId)
{
    var shaderScript, theSource, currentChild, shader;

    shaderScript = document.getElementById(shaderId);

    if (!shaderScript)
    {
        return null;
    }

    theSource = "";
    currentChild = shaderScript.firstChild;

    while(currentChild)
    {
        if (currentChild.nodeType == currentChild.TEXT_NODE)
        {
            theSource += currentChild.textContent;
        }

        currentChild = currentChild.nextSibling;
    }
    if (shaderScript.type == "x-shader/x-fragment")
    {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    }
    else if (shaderScript.type == "x-shader/x-vertex")
    {
        shader = gl.createShader(gl.VERTEX_SHADER);
    }
    else
    {
        // Unknown shader type
        return null;
    }

    gl.shaderSource(shader, theSource);
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
        astorb.log("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader), "red");
        return null;
    }

    return shader;
};

astorb.resourcePath = "temp/astorb3d.bin";
astorb.loadAstorbData = function()
{
    var resourcePath = astorb.resourcePath;
    astorb.log("loading '" + resourcePath + "'", "blue");
    astorb.loader = new astorb.Loader(resourcePath, astorb.onLoadAstorbData);
};

astorb.Loader = function(path, callback)
{
    this.path = path || null;
    var callback = callback || function(){};

    var request = new XMLHttpRequest();
    this.request = request;

    request.open("GET", path, true);
    request.responseType = "arraybuffer";
    request.onreadystatechange = function()
    {
        if (request.readyState === 4)
        {
            var errorCode = request.status;
            var response = request.response;
            callback(errorCode, response);
        }
    };

    request.send();
};

astorb.onLoadAstorbData = function(errorCode, response)
{
    if (errorCode == 200
        && response
        && response instanceof ArrayBuffer)
    {
        astorb.log("loaded astorb data", "green");
        var gl = astorb.gl;

        var astorbFloats = new Float32Array(response);
        var astorbFloatCount = astorbFloats.length;
        var floatsPerAsteroid = 6;
        var asteroidCount = astorbFloatCount / floatsPerAsteroid;
        astorb.log("asteroid count = " + asteroidCount, "black");
        astorb.asteroidCount = asteroidCount;

        // Debug: log first asteroid's orbital elements
        if (asteroidCount > 0) {
            astorb.log("First asteroid: M=" + astorbFloats[0].toFixed(2) +
                       " w=" + astorbFloats[1].toFixed(2) +
                       " O=" + astorbFloats[2].toFixed(2) +
                       " i=" + astorbFloats[3].toFixed(2) +
                       " e=" + astorbFloats[4].toFixed(4) +
                       " a=" + astorbFloats[5].toFixed(4) + " AU", "green");
        }

        var astorbBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, astorbBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, astorbFloats, gl.STATIC_DRAW);
        astorb.astorbBuffer = astorbBuffer;

        astorb.configureAttributePointers(gl);

        astorb.frameCount = 0;
        requestAnimationFrame(astorb.animate);
    }
    else
    {
        astorb.log("failed to load astorb data", "red");
    }
};

// Camera state
astorb.camera = {
    rotationX: 0.5,      // Initial tilt
    rotationY: 0.0,
    distance: 8.0,       // Distance from origin
    minDistance: 1.0,
    maxDistance: 150.0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
};

// Time control
astorb.time = {
    simTime: 0,              // Simulation time in seconds
    timeScale: 1000000,      // Speed multiplier (1 million = ~1 year per 30 seconds)
    lastTimestamp: 0,
    paused: false
};

astorb.initBuffers = function(gl)
{
    var canvas = astorb.canvas;
    var aspectRatio = canvas.width / canvas.height;

    var perspectiveMatrix = mat4.create();
    var cameraFieldOfViewRadians = Math.PI / 3; // 60 degree FOV
    var nearPlaneAU = 0.005;
    var farPlaneAU = 300.0;
    mat4.perspective(perspectiveMatrix, cameraFieldOfViewRadians, aspectRatio, nearPlaneAU, farPlaneAU);

    var shaderProgram = astorb.shaderProgram;
    var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    astorb.pUniform = pUniform;
    gl.uniformMatrix4fv(pUniform, false, perspectiveMatrix);

    astorb.mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    astorb.timeUniform = gl.getUniformLocation(shaderProgram, "time");

    // Set up camera controls
    astorb.setupCameraControls(canvas);

    // Initialize planet orbit paths
    astorb.initPlanetOrbits(gl);

    // Update the view matrix initially
    astorb.updateViewMatrix();
};

astorb.configureAttributePointers = function(gl)
{
    var bytesPerFloat = 4;
    var floatsPerVertex = 6;
    var floatStride = floatsPerVertex * bytesPerFloat;
    astorb.attributeStride = floatStride;

    if (astorb.aMeanAnomaly >= 0) {
        gl.vertexAttribPointer(astorb.aMeanAnomaly, 1, gl.FLOAT, false, floatStride, 0);
    }
    if (astorb.aArgumentOfPerihelion >= 0) {
        gl.vertexAttribPointer(astorb.aArgumentOfPerihelion, 1, gl.FLOAT, false, floatStride, 4);
    }
    if (astorb.aLongitudeOfAscendingNode >= 0) {
        gl.vertexAttribPointer(astorb.aLongitudeOfAscendingNode, 1, gl.FLOAT, false, floatStride, 8);
    }
    if (astorb.aInclination >= 0) {
        gl.vertexAttribPointer(astorb.aInclination, 1, gl.FLOAT, false, floatStride, 12);
    }
    if (astorb.aEccentricity >= 0) {
        gl.vertexAttribPointer(astorb.aEccentricity, 1, gl.FLOAT, false, floatStride, 16);
    }
    if (astorb.aSemimajorAxis >= 0) {
        gl.vertexAttribPointer(astorb.aSemimajorAxis, 1, gl.FLOAT, false, floatStride, 20);
    }
};

astorb.planetOrbits = [
    {name: "Mercury", a: 0.38709927, e: 0.20563593, i: 7.00497902, w: 29.12703035, O: 48.33076593, M: 174.795884},
    {name: "Venus", a: 0.72333566, e: 0.00677672, i: 3.39467605, w: 54.92262463, O: 76.67984255, M: 50.416113},
    {name: "Earth", a: 1.00000261, e: 0.01671123, i: -0.00001531, w: 102.93768193, O: -11.26064, M: 100.464571},
    {name: "Mars", a: 1.52371034, e: 0.09339410, i: 1.84969142, w: 286.537, O: 49.55953891, M: 19.412},
    {name: "Jupiter", a: 5.20288700, e: 0.04838624, i: 1.30439695, w: 273.867, O: 100.47390909, M: 20.020},
    {name: "Saturn", a: 9.53667594, e: 0.05386179, i: 2.48599187, w: 339.392, O: 113.66242448, M: 317.020},
    {name: "Uranus", a: 19.18916464, e: 0.04725744, i: 0.77263783, w: 96.998857, O: 74.01692503, M: 142.2386},
    {name: "Neptune", a: 30.06992276, e: 0.00859048, i: 1.77004347, w: 273.187, O: 131.78422574, M: 256.228}
];

astorb.initPlanetOrbits = function(gl)
{
    var segments = 240;
    var floatsPerVertex = 6;
    var planetCount = astorb.planetOrbits.length;
    var verticesPerOrbit = segments + 1;
    var totalVertices = planetCount * verticesPerOrbit;

    var orbitData = new Float32Array(totalVertices * floatsPerVertex);
    var offsets = [];
    var cursor = 0;

    for (var planetIndex = 0; planetIndex < planetCount; planetIndex++)
    {
        var planet = astorb.planetOrbits[planetIndex];
        offsets.push({name: planet.name, start: planetIndex * verticesPerOrbit, count: verticesPerOrbit});

        for (var segmentIndex = 0; segmentIndex < verticesPerOrbit; segmentIndex++)
        {
            var meanAnomaly = 360.0 * (segmentIndex / segments);
            orbitData[cursor++] = meanAnomaly;
            orbitData[cursor++] = planet.w;
            orbitData[cursor++] = planet.O;
            orbitData[cursor++] = planet.i;
            orbitData[cursor++] = planet.e;
            orbitData[cursor++] = planet.a;
        }
    }

    var orbitBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, orbitBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, orbitData, gl.STATIC_DRAW);

    astorb.planetOrbitBuffer = orbitBuffer;
    astorb.planetOrbitOffsets = offsets;
    astorb.planetOrbitSegments = segments;
};

astorb.setupCameraControls = function(canvas)
{
    var camera = astorb.camera;

    // Mouse down - start dragging
    canvas.addEventListener('mousedown', function(event) {
        camera.isDragging = true;
        camera.lastMouseX = event.clientX;
        camera.lastMouseY = event.clientY;
        canvas.focus();  // Focus canvas for keyboard input
        event.preventDefault();
    });

    // Mouse up - stop dragging
    window.addEventListener('mouseup', function(event) {
        camera.isDragging = false;
    });

    // Mouse move - rotate camera
    canvas.addEventListener('mousemove', function(event) {
        if (!camera.isDragging) return;

        var deltaX = event.clientX - camera.lastMouseX;
        var deltaY = event.clientY - camera.lastMouseY;

        camera.rotationY += deltaX * 0.005;
        camera.rotationX += deltaY * 0.005;

        // Clamp vertical rotation to avoid flipping
        camera.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotationX));

        camera.lastMouseX = event.clientX;
        camera.lastMouseY = event.clientY;

        astorb.updateViewMatrix();
    });

    // Touch controls - single finger rotate, pinch to zoom
    var touchState = {
        isDragging: false,
        lastX: 0,
        lastY: 0,
        lastDistance: 0,
        isPinching: false
    };

    canvas.addEventListener('touchstart', function(event) {
        if (event.touches.length === 1) {
            var touch = event.touches[0];
            touchState.isDragging = true;
            touchState.isPinching = false;
            touchState.lastX = touch.clientX;
            touchState.lastY = touch.clientY;
        } else if (event.touches.length === 2) {
            var dx = event.touches[0].clientX - event.touches[1].clientX;
            var dy = event.touches[0].clientY - event.touches[1].clientY;
            touchState.lastDistance = Math.sqrt(dx * dx + dy * dy);
            touchState.isPinching = true;
            touchState.isDragging = false;
        }
        event.preventDefault();
    }, {passive: false});

    canvas.addEventListener('touchmove', function(event) {
        if (event.touches.length === 1 && touchState.isDragging) {
            var touch = event.touches[0];
            var deltaX = touch.clientX - touchState.lastX;
            var deltaY = touch.clientY - touchState.lastY;

            camera.rotationY += deltaX * 0.005;
            camera.rotationX += deltaY * 0.005;
            camera.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotationX));

            touchState.lastX = touch.clientX;
            touchState.lastY = touch.clientY;
            astorb.updateViewMatrix();
        } else if (event.touches.length === 2 && touchState.isPinching) {
            var dx = event.touches[0].clientX - event.touches[1].clientX;
            var dy = event.touches[0].clientY - event.touches[1].clientY;
            var distance = Math.sqrt(dx * dx + dy * dy);

            if (touchState.lastDistance > 0) {
                var zoomDelta = (touchState.lastDistance - distance) * 0.002;
                camera.distance += zoomDelta * camera.distance;
                camera.distance = Math.max(camera.minDistance, Math.min(camera.maxDistance, camera.distance));
                astorb.updateViewMatrix();
            }

            touchState.lastDistance = distance;
        }
        event.preventDefault();
    }, {passive: false});

    canvas.addEventListener('touchend', function(event) {
        if (event.touches.length === 0) {
            touchState.isDragging = false;
            touchState.isPinching = false;
            touchState.lastDistance = 0;
        }
    }, {passive: false});

    // Mouse wheel - zoom
    canvas.addEventListener('wheel', function(event) {
        var zoomSpeed = 0.001;
        camera.distance += event.deltaY * zoomSpeed * camera.distance;
        camera.distance = Math.max(camera.minDistance, Math.min(camera.maxDistance, camera.distance));

        astorb.updateViewMatrix();
        event.preventDefault();
    });

    // Keyboard controls - listen on both canvas and window
    var handleKeydown = function(event) {
        var time = astorb.time;
        switch(event.key) {
            case ' ':  // Space - pause/resume
                time.paused = !time.paused;
                astorb.log("Time " + (time.paused ? "paused" : "resumed"), "blue");
                event.preventDefault();
                break;
            case 'ArrowUp':  // Speed up time
                time.timeScale *= 2;
                astorb.log("Time scale: " + time.timeScale.toExponential(1), "blue");
                event.preventDefault();
                break;
            case 'ArrowDown':  // Slow down time
                time.timeScale /= 2;
                astorb.log("Time scale: " + time.timeScale.toExponential(1), "blue");
                event.preventDefault();
                break;
            case 'r':  // Reset view
            case 'R':
                camera.rotationX = 0.5;
                camera.rotationY = 0;
                camera.distance = 8.0;
                time.simTime = 0;
                astorb.updateViewMatrix();
                astorb.log("View reset", "blue");
                event.preventDefault();
                break;
        }
    };

    canvas.addEventListener('keydown', handleKeydown);
    window.addEventListener('keydown', handleKeydown);

    astorb.log("Controls: Drag to rotate, Scroll/pinch to zoom, Space=pause, Up/Down=speed, R=reset", "green");
    astorb.log("Click on canvas first to enable keyboard controls", "green");
};

astorb.updateViewMatrix = function()
{
    var gl = astorb.gl;
    var camera = astorb.camera;

    var mvMatrix = mat4.create();
    mat4.identity(mvMatrix);

    // Apply transformations: translate back, then rotate
    var translationVector = vec3.fromValues(0.0, 0.0, -camera.distance);
    mat4.translate(mvMatrix, mvMatrix, translationVector);

    mat4.rotateX(mvMatrix, mvMatrix, camera.rotationX);
    mat4.rotateY(mvMatrix, mvMatrix, camera.rotationY);

    gl.uniformMatrix4fv(astorb.mvUniform, false, mvMatrix);
};

astorb.animate = function(timestamp)
{
    var gl = astorb.gl;
    var asteroidCount = astorb.asteroidCount;
    var time = astorb.time;

    // Keep buffer sized even if layout changes during animation.
    astorb.resizeWebGL();

    // Calculate delta time
    if (time.lastTimestamp === 0) {
        time.lastTimestamp = timestamp;
    }
    var deltaTime = (timestamp - time.lastTimestamp) / 1000.0;  // Convert to seconds
    time.lastTimestamp = timestamp;

    // Update simulation time if not paused
    if (!time.paused) {
        time.simTime += deltaTime * time.timeScale;
    }

    // Update time uniform
    gl.uniform1f(astorb.timeUniform, time.simTime);

    // Update camera view matrix every frame
    astorb.updateViewMatrix();

    // Update status display
    astorb.frameCount++;
    if (astorb.frameCount % 10 === 0) {
        var statusDiv = document.getElementById('statusDisplay');
        if (statusDiv) {
            var years = time.simTime / (365.25 * 24 * 3600);  // Convert seconds to years
            var pauseStatus = time.paused ? "[PAUSED]" : "[RUNNING]";
            statusDiv.innerHTML = pauseStatus + " Time: " + years.toFixed(2) + " years | " +
                "Asteroids: " + asteroidCount + " | " +
                "Camera: distance=" + astorb.camera.distance.toFixed(1) + " AU | " +
                "Controls: Drag=rotate, Scroll/pinch=zoom, Space=pause, Up/Down=speed, R=reset";
        }
    }

    // Log time every 300 frames for debugging
    // if (astorb.frameCount % 300 === 0) {
    //     astorb.log("Frame " + astorb.frameCount + ", simTime=" + time.simTime.toExponential(2), "gray");
    // }

    // Render
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (astorb.planetOrbitBuffer)
    {
        gl.bindBuffer(gl.ARRAY_BUFFER, astorb.planetOrbitBuffer);
        astorb.configureAttributePointers(gl);
        gl.uniform1f(astorb.timeUniform, 0);

        for (var orbitIndex = 0; orbitIndex < astorb.planetOrbitOffsets.length; orbitIndex++)
        {
            var orbit = astorb.planetOrbitOffsets[orbitIndex];
            gl.drawArrays(gl.LINE_STRIP, orbit.start, orbit.count);
        }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, astorb.astorbBuffer);
    astorb.configureAttributePointers(gl);
    gl.uniform1f(astorb.timeUniform, time.simTime);
    gl.drawArrays(gl.POINTS, 0, asteroidCount);

    requestAnimationFrame(astorb.animate);
};
