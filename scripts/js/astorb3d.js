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

astorb.formatNumber = function(value)
{
    if (value === null || value === undefined)
    {
        return "--";
    }
    return Number(value).toLocaleString('en-US');
};

astorb.formatAsteroidPercent = function(current, total)
{
    if (!total)
    {
        return "0%";
    }
    var percent = (current / total) * 100;
    return percent.toFixed(1) + "%";
};

astorb.formatBytes = function(bytes)
{
    if (bytes === null || bytes === undefined || isNaN(bytes))
    {
        return "--";
    }
    if (bytes === 0)
    {
        return "0 B";
    }
    var units = ["B", "KB", "MB", "GB", "TB"];
    var index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    var value = bytes / Math.pow(1024, index);
    return value.toFixed(value >= 10 || index === 0 ? 0 : 1) + " " + units[index];
};

astorb.formatBitsPerSecond = function(bitsPerSecond)
{
    if (!bitsPerSecond || !isFinite(bitsPerSecond))
    {
        return "--";
    }
    var units = ["bps", "Kbps", "Mbps", "Gbps"];
    var index = Math.min(units.length - 1, Math.floor(Math.log(bitsPerSecond) / Math.log(1000)));
    var value = bitsPerSecond / Math.pow(1000, index);
    return value.toFixed(value >= 10 || index === 0 ? 0 : 1) + " " + units[index];
};

astorb.initLoadingOverlay = function()
{
    var overlay = document.getElementById("loadingOverlay");
    var indicator = document.querySelector("#loadingProgress .indicator");
    if (!overlay || !indicator)
    {
        return null;
    }

    var radius = parseFloat(indicator.getAttribute("r")) || 0;
    var circumference = 2 * Math.PI * radius;
    indicator.style.strokeDasharray = circumference;
    indicator.style.strokeDashoffset = circumference;

    astorb.loadingElements = {
        overlay: overlay,
        indicator: indicator,
        circumference: circumference,
        percentage: document.getElementById("loadingPercentage"),
        rate: document.getElementById("loadingRate"),
        size: document.getElementById("loadingSize"),
        downloaded: document.getElementById("loadingDownloaded")
    };

    return astorb.loadingElements;
};

astorb.showLoadingOverlay = function()
{
    var elements = astorb.loadingElements || astorb.initLoadingOverlay();
    if (!elements)
    {
        return;
    }
    elements.overlay.classList.remove("hidden");
    astorb.loadingState = {
        startTime: performance.now(),
        totalBytes: null
    };
    astorb.updateLoadingOverlay(0, null);
};

astorb.updateLoadingOverlay = function(loaded, total)
{
    var elements = astorb.loadingElements;
    if (!elements)
    {
        return;
    }
    var percent = total ? (loaded / total) * 100 : 0;
    var clampedPercent = Math.max(0, Math.min(100, percent));
    var offset = elements.circumference * (1 - clampedPercent / 100);
    elements.indicator.style.strokeDashoffset = offset;

    var elapsedSeconds = (performance.now() - astorb.loadingState.startTime) / 1000;
    var bitsPerSecond = elapsedSeconds > 0 ? (loaded * 8) / elapsedSeconds : 0;

    if (elements.percentage)
    {
        elements.percentage.textContent = clampedPercent.toFixed(1) + "%";
    }
    if (elements.rate)
    {
        elements.rate.textContent = "Rate: " + astorb.formatBitsPerSecond(bitsPerSecond);
    }
    if (elements.size)
    {
        elements.size.textContent = "Total: " + astorb.formatBytes(total);
    }
    if (elements.downloaded)
    {
        elements.downloaded.textContent = "Downloaded: " + astorb.formatBytes(loaded);
    }
};

astorb.hideLoadingOverlay = function()
{
    var elements = astorb.loadingElements;
    if (!elements)
    {
        return;
    }
    elements.overlay.classList.add("hidden");
};

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
    astorb.projectionMatrix = perspectiveMatrix;

    gl.useProgram(astorb.asteroidProgram);
    gl.uniformMatrix4fv(astorb.pUniform, false, perspectiveMatrix);
    if (astorb.bodyUniforms)
    {
        gl.useProgram(astorb.bodyProgram);
        gl.uniformMatrix4fv(astorb.bodyUniforms.pMatrix, false, perspectiveMatrix);
    }
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
astorb.depthBufferEnabled = true;
astorb.onLoadBody = function()
{
    var canvas = document.getElementById(astorb.canvasId);
    if (canvas)
    {
        var gl = null;

        try
        {
            var contextOptions = {antialias: false, depth: true};
            gl = canvas.getContext("webgl", contextOptions)
                || canvas.getContext("experimental-webgl", contextOptions);
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

                astorb.setupTimeControls();
                astorb.setupAsteroidControls();
                astorb.setupDepthBufferControls();
                astorb.setupMotionBlurControls();
                astorb.setupRenderColorControls();
                astorb.initStats();
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
        astorb.applyDepthBufferState();
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Size from layout.
        astorb.resizeWebGL();

        astorb.initShaders(gl);
        astorb.initBodyShaders(gl);
        astorb.initBuffers(gl);
        astorb.initOrbitLabels();

        success = true;
    }
    else
    {
        astorb.log("invalid WebGL context", "red");
    }

    return success;
};

astorb.applyDepthBufferState = function()
{
    var gl = astorb.gl;
    if (!gl) return;

    if (astorb.depthBufferEnabled)
    {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(true);
        gl.clearDepth(1.0);
    }
    else
    {
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
    }
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
    astorb.asteroidProgram = shaderProgram;

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

astorb.initBodyShaders = function(gl)
{
    var fragmentShader = astorb.getShader(gl, "shader-bodies-fs");
    var vertexShader = astorb.getShader(gl, "shader-bodies-vs");

    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
    {
        astorb.log("Unable to initialize the body shader program: " + gl.getProgramInfoLog(shaderProgram), "red");
    }

    astorb.bodyProgram = shaderProgram;
    astorb.bodyAttributes = {
        position: gl.getAttribLocation(shaderProgram, "aPosition"),
        radius: gl.getAttribLocation(shaderProgram, "aRadius"),
        color: gl.getAttribLocation(shaderProgram, "aColor")
    };
    astorb.bodyUniforms = {
        mvMatrix: gl.getUniformLocation(shaderProgram, "uMVMatrix"),
        pMatrix: gl.getUniformLocation(shaderProgram, "uPMatrix"),
        pointScale: gl.getUniformLocation(shaderProgram, "uPointScale"),
        opacity: gl.getUniformLocation(shaderProgram, "uOpacity")
    };
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
    astorb.showLoadingOverlay();
    astorb.loader = new astorb.Loader(resourcePath, astorb.onLoadAstorbData, astorb.updateLoadingOverlay);
};

astorb.Loader = function(path, callback, progressCallback)
{
    this.path = path || null;
    var callback = callback || function(){};
    var progressCallback = progressCallback || function(){};

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

    request.onprogress = function(event)
    {
        var totalBytes = event.lengthComputable ? event.total : null;
        progressCallback(event.loaded, totalBytes);
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
        astorb.hideLoadingOverlay();
        astorb.dataLoaded = true;
        window.__astorbDataLoaded = true;
        document.dispatchEvent(new CustomEvent('astorb:data-loaded'));
        var gl = astorb.gl;

        var astorbFloats = new Float32Array(response);
        var astorbFloatCount = astorbFloats.length;
        var floatsPerAsteroid = 6;
        var asteroidCount = astorbFloatCount / floatsPerAsteroid;
        astorb.log("asteroid count = " + asteroidCount, "black");
        astorb.asteroidCount = asteroidCount;
        astorb.asteroidDrawCount = asteroidCount;
        astorb.refreshAsteroidControls();

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
        astorb.hideLoadingOverlay();
    }
};

// Camera state
astorb.camera = {
    // azimuth: horizontal angle in the ecliptic plane (X-Y). 0 = looking from +Y toward origin.
    // elevation: angle above/below the ecliptic plane. 0 = in plane, +80° = above, -80° = below.
    azimuth: 0.0,
    elevation: 20.0 * Math.PI / 180.0,  // Start slightly above the ecliptic plane
    distance: 12.0,       // Distance from origin in AU
    minDistance: 1.0,
    maxDistance: 150.0,
    // Vertical orbit limits expressed as +/- degrees above/below the ecliptic.
    maxElevationRadians: (80.0 * Math.PI / 180.0),
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
};

// Epoch configuration:
// - planetEpochMs: epoch (J2000.0) used for planetary orbital elements, expressed as UTC milliseconds.
// - asteroidEpochMs: epoch of the asteroid orbital elements catalog (October 15, 2013, 12:00 UTC).
// These values are used so that planetary positions (computed from J2000.0 elements) can be
// shifted to the asteroid elements epoch, ensuring all bodies start the simulation at the same
// reference time.
astorb.epoch = {
    planetEpochMs: Date.UTC(2000, 0, 1, 12, 0, 0),
    asteroidEpochMs: Date.UTC(2013, 9, 15, 12, 0, 0)
};

// Time offset (in seconds) between the planetary J2000.0 epoch and the asteroid elements epoch.
// This is applied when computing planetary positions so they are aligned with the asteroid epoch
// when the simulation starts.
astorb.planetEpochOffsetSec = (astorb.epoch.asteroidEpochMs - astorb.epoch.planetEpochMs) / 1000.0;

// Time control
astorb.time = {
    simTime: 0,              // Simulation time in seconds
    timeScale: 1000000,      // Speed multiplier (1 million = ~1 year per 30 seconds)
    lastTimestamp: 0,
    paused: false
};

astorb.motionBlur = {
    enabled: false,
    sampleCount: 5,
    spanMultiplier: 6,
    maxSpanSeconds: 24 * 60 * 60,
    opacity: 0.4
};

astorb.dataLoaded = false;
astorb.firstFrameRendered = false;
window.__astorbDataLoaded = false;
window.__astorbFirstFrameRendered = false;
astorb.asteroidDrawCount = 0;

astorb.initBuffers = function(gl)
{
    var canvas = astorb.canvas;
    var aspectRatio = canvas.width / canvas.height;

    var perspectiveMatrix = mat4.create();
    var cameraFieldOfViewRadians = Math.PI / 3; // 60 degree FOV
    var nearPlaneAU = 0.005;
    var farPlaneAU = 300.0;
    astorb.farPlaneAU = farPlaneAU;
    mat4.perspective(perspectiveMatrix, cameraFieldOfViewRadians, aspectRatio, nearPlaneAU, farPlaneAU);
    astorb.projectionMatrix = perspectiveMatrix;

    gl.useProgram(astorb.asteroidProgram);
    var shaderProgram = astorb.asteroidProgram;
    var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    astorb.pUniform = pUniform;
    gl.uniformMatrix4fv(pUniform, false, perspectiveMatrix);

    astorb.mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    astorb.timeUniform = gl.getUniformLocation(shaderProgram, "time");
    astorb.colorModeUniform = gl.getUniformLocation(shaderProgram, "uColorMode");
    astorb.farPlaneUniform = gl.getUniformLocation(shaderProgram, "uFarPlaneAU");
    astorb.opacityUniform = gl.getUniformLocation(shaderProgram, "uOpacity");

    if (astorb.colorModeUniform !== null)
    {
        gl.uniform1i(astorb.colorModeUniform, astorb.colorModeIndex || 0);
    }
    if (astorb.farPlaneUniform !== null)
    {
        gl.uniform1f(astorb.farPlaneUniform, astorb.farPlaneAU);
    }
    if (astorb.opacityUniform !== null)
    {
        gl.uniform1f(astorb.opacityUniform, 1.0);
    }

    if (astorb.bodyUniforms)
    {
        gl.useProgram(astorb.bodyProgram);
        gl.uniformMatrix4fv(astorb.bodyUniforms.pMatrix, false, perspectiveMatrix);
        gl.uniform1f(astorb.bodyUniforms.pointScale, astorb.bodyScale);
        if (astorb.bodyUniforms.opacity !== null)
        {
            gl.uniform1f(astorb.bodyUniforms.opacity, 1.0);
        }
    }

    // Set up camera controls
    astorb.setupCameraControls(canvas);

    // Initialize planet orbit paths
    astorb.initPlanetOrbits(gl);
    astorb.initDwarfPlanetOrbits(gl);
    astorb.initBodies(gl);

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

astorb.dwarfPlanetOrbits = [
    {name: "Ceres", a: 2.7675, e: 0.0758, i: 10.594, w: 73.5977, O: 80.3055, M: 95.989},
    {name: "Pluto", a: 39.482, e: 0.2488, i: 17.14, w: 113.763, O: 110.299, M: 14.53},
    {name: "Haumea", a: 43.218, e: 0.191, i: 28.19, w: 240.6, O: 121.9, M: 205.1},
    {name: "Makemake", a: 45.436, e: 0.161, i: 28.98, w: 294.8, O: 79.6, M: 92.3},
    {name: "Eris", a: 67.781, e: 0.44, i: 44.04, w: 151.6, O: 35.95, M: 204.4}
];

astorb.constants = {
    auKm: 149597870.7,
    muSun: 3.96401599E-14
};

astorb.bodyScale = 320000.0;
astorb.radiusScale = {
    km: 6000.0
};

astorb.bodies = [
    {name: "Sun", type: "sun", radiusKm: 696340, color: [1.0, 0.85, 0.3]}
];

astorb.planetBodies = [
    {name: "Mercury", radiusKm: 2439.7, color: [0.7, 0.7, 0.7]},
    {name: "Venus", radiusKm: 6051.8, color: [0.9, 0.75, 0.5]},
    {name: "Earth", radiusKm: 6371.0, color: [0.3, 0.5, 1.0]},
    {name: "Mars", radiusKm: 3389.5, color: [0.9, 0.4, 0.2]},
    {name: "Jupiter", radiusKm: 69911, color: [0.9, 0.8, 0.6]},
    {name: "Saturn", radiusKm: 58232, color: [0.9, 0.8, 0.5]},
    {name: "Uranus", radiusKm: 25362, color: [0.6, 0.8, 0.9]},
    {name: "Neptune", radiusKm: 24622, color: [0.3, 0.5, 0.9]}
];

astorb.dwarfPlanetBodies = [
    {name: "Ceres", radiusKm: 473, color: [0.75, 0.7, 0.65], sizeScale: 0.6},
    {name: "Pluto", radiusKm: 1188.3, color: [0.85, 0.75, 0.65], sizeScale: 0.6},
    {name: "Haumea", radiusKm: 816, color: [0.85, 0.9, 0.95], sizeScale: 0.6},
    {name: "Makemake", radiusKm: 715, color: [0.9, 0.6, 0.35], sizeScale: 0.6},
    {name: "Eris", radiusKm: 1163, color: [0.8, 0.85, 0.95], sizeScale: 0.6}
];

astorb.moonBodies = [
    {name: "Moon", parent: "Earth", radiusKm: 1737.4, semiMajorAxisKm: 384400, periodDays: 27.321661, color: [0.8, 0.8, 0.85]},
    {name: "Phobos", parent: "Mars", radiusKm: 11.3, semiMajorAxisKm: 9376, periodDays: 0.31891, color: [0.7, 0.7, 0.7]},
    {name: "Ganymede", parent: "Jupiter", radiusKm: 2634.1, semiMajorAxisKm: 1070400, periodDays: 7.154553, color: [0.75, 0.7, 0.6]},
    {name: "Titan", parent: "Saturn", radiusKm: 2574.7, semiMajorAxisKm: 1221870, periodDays: 15.945, color: [0.85, 0.7, 0.5]},
    {name: "Titania", parent: "Uranus", radiusKm: 788.9, semiMajorAxisKm: 435910, periodDays: 8.706, color: [0.7, 0.8, 0.9]},
    {name: "Triton", parent: "Neptune", radiusKm: 1353.4, semiMajorAxisKm: 354759, periodDays: -5.87685, color: [0.7, 0.8, 0.9]}
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

astorb.initDwarfPlanetOrbits = function(gl)
{
    var segments = 480;
    var floatsPerVertex = 6;
    var dwarfCount = astorb.dwarfPlanetOrbits.length;
    var verticesPerOrbit = segments + 1;
    var totalVertices = dwarfCount * verticesPerOrbit;
    var orbitData = new Float32Array(totalVertices * floatsPerVertex);
    var offsets = [];
    var cursor = 0;

    for (var orbitIndex = 0; orbitIndex < dwarfCount; orbitIndex++)
    {
        var orbit = astorb.dwarfPlanetOrbits[orbitIndex];
        offsets.push({name: orbit.name, start: orbitIndex * verticesPerOrbit, count: verticesPerOrbit});

        for (var segmentIndex = 0; segmentIndex < verticesPerOrbit; segmentIndex++)
        {
            var meanAnomaly = 360.0 * (segmentIndex / segments);
            orbitData[cursor++] = meanAnomaly;
            orbitData[cursor++] = orbit.w;
            orbitData[cursor++] = orbit.O;
            orbitData[cursor++] = orbit.i;
            orbitData[cursor++] = orbit.e;
            orbitData[cursor++] = orbit.a;
        }
    }

    var orbitBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, orbitBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, orbitData, gl.STATIC_DRAW);

    astorb.dwarfPlanetOrbitBuffer = orbitBuffer;
    astorb.dwarfPlanetOrbitOffsets = offsets;
    astorb.dwarfPlanetOrbitSegments = segments;
};

astorb.initBodies = function(gl)
{
    var bodyList = astorb.bodies.concat(astorb.planetBodies, astorb.dwarfPlanetBodies, astorb.moonBodies);
    astorb.bodyList = bodyList;
    astorb.bodyCount = bodyList.length;

    var bodyBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bodyBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(astorb.bodyCount * 7), gl.DYNAMIC_DRAW);
    astorb.bodyBuffer = bodyBuffer;
};

astorb.getScaledRadiusAu = function(radiusKm, sizeScale)
{
    var logRadius = Math.log(radiusKm) / Math.LN10;
    var scaledKm = logRadius * astorb.radiusScale.km;
    var scale = sizeScale === undefined ? 1.0 : sizeScale;
    return (scaledKm * scale) / astorb.constants.auKm;
};

astorb.computeKeplerPosition = function(orbit, timeSec)
{
    // Adjust time so planet positions (using J2000.0 orbital elements) align with the asteroid epoch (2013-10-15),
    // ensuring all bodies are computed for the same reference time.
    var adjustedTimeSec = timeSec + astorb.planetEpochOffsetSec;
    var deg2rad = Math.PI / 180.0;
    var a = orbit.a;
    var e = orbit.e;
    var i = orbit.i * deg2rad;
    var omega = orbit.w * deg2rad;
    var sigma = orbit.O * deg2rad;
    var M0 = orbit.M * deg2rad;
    var muSun = astorb.constants.muSun;

    var n = Math.sqrt(muSun / Math.pow(a, 3.0));
    var M = (n * adjustedTimeSec + M0) % (2.0 * Math.PI);

    var E = M;
    for (var iteration = 0; iteration < 30; iteration++)
    {
        E = E - (E - e * Math.sin(E) - M) / (1.0 - e * Math.cos(E));
    }
    var r = a * (1.0 - e * Math.cos(E));
    var nu = 2.0 * Math.atan2(Math.sqrt(1.0 + e) * Math.sin(E / 2.0),
        Math.sqrt(1.0 - e) * Math.cos(E / 2.0));

    var theta = omega + nu;

    var x = r * (Math.cos(sigma) * Math.cos(theta) - Math.sin(sigma) * Math.sin(theta) * Math.cos(i));
    var y = r * (Math.sin(sigma) * Math.cos(theta) + Math.cos(sigma) * Math.sin(theta) * Math.cos(i));
    var z = r * (Math.sin(i) * Math.sin(theta));

    return [x, y, z];
};

astorb.computeOrbitPoint = function(orbit, meanAnomalyDeg)
{
    var deg2rad = Math.PI / 180.0;
    var a = orbit.a;
    var e = orbit.e;
    var i = orbit.i * deg2rad;
    var omega = orbit.w * deg2rad;
    var sigma = orbit.O * deg2rad;
    var M = meanAnomalyDeg * deg2rad;

    var E = M;
    for (var iteration = 0; iteration < 30; iteration++)
    {
        E = E - (E - e * Math.sin(E) - M) / (1.0 - e * Math.cos(E));
    }
    var r = a * (1.0 - e * Math.cos(E));
    var nu = 2.0 * Math.atan2(Math.sqrt(1.0 + e) * Math.sin(E / 2.0),
        Math.sqrt(1.0 - e) * Math.cos(E / 2.0));

    var theta = omega + nu;

    var x = r * (Math.cos(sigma) * Math.cos(theta) - Math.sin(sigma) * Math.sin(theta) * Math.cos(i));
    var y = r * (Math.sin(sigma) * Math.cos(theta) + Math.cos(sigma) * Math.sin(theta) * Math.cos(i));
    var z = r * (Math.sin(i) * Math.sin(theta));

    return [x, y, z];
};

astorb.initOrbitLabels = function()
{
    var labelLayer = document.getElementById("labelLayer");
    if (!labelLayer)
    {
        return;
    }

    astorb.labelLayer = labelLayer;
    labelLayer.innerHTML = "";

    var labels = [];
    var addLabel = function(name, orbit, segments)
    {
        var label = document.createElement("div");
        label.className = "orbit-label";
        label.textContent = name;
        labelLayer.appendChild(label);
        labels.push({
            name: name,
            orbit: orbit,
            segments: segments,
            element: label
        });
    };

    for (var planetIndex = 0; planetIndex < astorb.planetOrbits.length; planetIndex++)
    {
        addLabel(astorb.planetOrbits[planetIndex].name, astorb.planetOrbits[planetIndex], astorb.planetOrbitSegments || 240);
    }

    for (var dwarfIndex = 0; dwarfIndex < astorb.dwarfPlanetOrbits.length; dwarfIndex++)
    {
        addLabel(astorb.dwarfPlanetOrbits[dwarfIndex].name, astorb.dwarfPlanetOrbits[dwarfIndex], astorb.dwarfPlanetOrbitSegments || 480);
    }

    astorb.orbitLabels = labels;
};

astorb.updateOrbitLabels = function()
{
    if (!astorb.orbitLabels || !astorb.projectionMatrix || !astorb.mvMatrix || !astorb.canvas)
    {
        return;
    }

    var cameraPosition = astorb.cameraWorldPosition || [0, 0, 0];
    var viewProjection = mat4.create();
    mat4.multiply(viewProjection, astorb.projectionMatrix, astorb.mvMatrix);

    var rect = astorb.canvas.getBoundingClientRect();
    var width = rect.width;
    var height = rect.height;

    for (var labelIndex = 0; labelIndex < astorb.orbitLabels.length; labelIndex++)
    {
        var labelInfo = astorb.orbitLabels[labelIndex];
        var orbit = labelInfo.orbit;
        var segments = labelInfo.segments || 240;
        var minDistance = Infinity;
        var closestPoint = null;

        for (var segmentIndex = 0; segmentIndex <= segments; segmentIndex++)
        {
            var meanAnomaly = 360.0 * (segmentIndex / segments);
            var point = astorb.computeOrbitPoint(orbit, meanAnomaly);
            var dx = point[0] - cameraPosition[0];
            var dy = point[1] - cameraPosition[1];
            var dz = point[2] - cameraPosition[2];
            var distance = dx * dx + dy * dy + dz * dz;
            if (distance < minDistance)
            {
                minDistance = distance;
                closestPoint = point;
            }
        }

        if (!closestPoint)
        {
            labelInfo.element.style.display = "none";
            continue;
        }

        var clip = vec4.fromValues(closestPoint[0], closestPoint[1], closestPoint[2], 1.0);
        vec4.transformMat4(clip, clip, viewProjection);
        if (clip[3] <= 0.0)
        {
            labelInfo.element.style.display = "none";
            continue;
        }

        var ndcX = clip[0] / clip[3];
        var ndcY = clip[1] / clip[3];
        var ndcZ = clip[2] / clip[3];

        if (ndcZ < -1 || ndcZ > 1)
        {
            labelInfo.element.style.display = "none";
            continue;
        }

        var screenX = (ndcX * 0.5 + 0.5) * width;
        var screenY = (1 - (ndcY * 0.5 + 0.5)) * height;

        var element = labelInfo.element;
        element.style.display = "block";
        element.style.left = screenX + "px";
        element.style.top = screenY + "px";
    }
};

astorb.computeMoonPosition = function(moon, parentPosition, timeSec)
{
    var periodSec = Math.abs(moon.periodDays) * 24.0 * 3600.0;
    var direction = moon.periodDays < 0 ? -1.0 : 1.0;
    var meanMotion = (2.0 * Math.PI / periodSec) * direction;
    var meanAnomaly = meanMotion * timeSec;
    var distanceAu = moon.semiMajorAxisKm / astorb.constants.auKm;

    var x = distanceAu * Math.cos(meanAnomaly);
    var y = distanceAu * Math.sin(meanAnomaly);
    var z = 0.0;

    return [
        parentPosition[0] + x,
        parentPosition[1] + y,
        parentPosition[2] + z
    ];
};

astorb.updateBodies = function(timeSec)
{
    var gl = astorb.gl;
    if (!astorb.bodyBuffer) return;

    var bodyData = new Float32Array(astorb.bodyCount * 7);
    var cursor = 0;

    var positions = {};

    bodyData[cursor++] = 0.0;
    bodyData[cursor++] = 0.0;
    bodyData[cursor++] = 0.0;
    bodyData[cursor++] = astorb.getScaledRadiusAu(astorb.bodies[0].radiusKm);
    bodyData[cursor++] = astorb.bodies[0].color[0];
    bodyData[cursor++] = astorb.bodies[0].color[1];
    bodyData[cursor++] = astorb.bodies[0].color[2];
    positions["Sun"] = [0.0, 0.0, 0.0];

    for (var planetIndex = 0; planetIndex < astorb.planetBodies.length; planetIndex++)
    {
        var planet = astorb.planetBodies[planetIndex];
        var orbit = astorb.planetOrbits[planetIndex];
        var position = astorb.computeKeplerPosition(orbit, timeSec);
        positions[planet.name] = position;

        bodyData[cursor++] = position[0];
        bodyData[cursor++] = position[1];
        bodyData[cursor++] = position[2];
        bodyData[cursor++] = astorb.getScaledRadiusAu(planet.radiusKm, planet.sizeScale);
        bodyData[cursor++] = planet.color[0];
        bodyData[cursor++] = planet.color[1];
        bodyData[cursor++] = planet.color[2];
    }

    for (var dwarfIndex = 0; dwarfIndex < astorb.dwarfPlanetBodies.length; dwarfIndex++)
    {
        var dwarf = astorb.dwarfPlanetBodies[dwarfIndex];
        var dwarfOrbit = astorb.dwarfPlanetOrbits[dwarfIndex];
        var dwarfPosition = astorb.computeKeplerPosition(dwarfOrbit, timeSec);
        positions[dwarf.name] = dwarfPosition;

        bodyData[cursor++] = dwarfPosition[0];
        bodyData[cursor++] = dwarfPosition[1];
        bodyData[cursor++] = dwarfPosition[2];
        bodyData[cursor++] = astorb.getScaledRadiusAu(dwarf.radiusKm, dwarf.sizeScale);
        bodyData[cursor++] = dwarf.color[0];
        bodyData[cursor++] = dwarf.color[1];
        bodyData[cursor++] = dwarf.color[2];
    }

    for (var moonIndex = 0; moonIndex < astorb.moonBodies.length; moonIndex++)
    {
        var moon = astorb.moonBodies[moonIndex];
        var parentPosition = positions[moon.parent] || [0.0, 0.0, 0.0];
        var moonPosition = astorb.computeMoonPosition(moon, parentPosition, timeSec);

        bodyData[cursor++] = moonPosition[0];
        bodyData[cursor++] = moonPosition[1];
        bodyData[cursor++] = moonPosition[2];
        bodyData[cursor++] = astorb.getScaledRadiusAu(moon.radiusKm);
        bodyData[cursor++] = moon.color[0];
        bodyData[cursor++] = moon.color[1];
        bodyData[cursor++] = moon.color[2];
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, astorb.bodyBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, bodyData, gl.DYNAMIC_DRAW);
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

        // Orbit controls:
        // - Horizontal drag: azimuth in the ecliptic plane (unlimited)
        // - Vertical drag: elevation above/below ecliptic (clamped to +/-80°)
        var rotateSpeed = 0.005;
        camera.azimuth += deltaX * rotateSpeed;
        camera.elevation += deltaY * rotateSpeed;

        // Clamp elevation to +/-80 degrees above/below the ecliptic.
        var maxElev = camera.maxElevationRadians || (80.0 * Math.PI / 180.0);
        camera.elevation = Math.max(-maxElev, Math.min(maxElev, camera.elevation));

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

            var rotateSpeed = 0.005;
            camera.azimuth += deltaX * rotateSpeed;
            camera.elevation += deltaY * rotateSpeed;

            var maxElev = camera.maxElevationRadians || (80.0 * Math.PI / 180.0);
            camera.elevation = Math.max(-maxElev, Math.min(maxElev, camera.elevation));

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
                astorb.refreshTimeControls();
                event.preventDefault();
                break;
            case 'ArrowUp':  // Speed up time
                time.timeScale *= 2;
                astorb.log("Time scale: " + time.timeScale.toExponential(1), "blue");
                astorb.refreshTimeControls();
                event.preventDefault();
                break;
            case 'ArrowDown':  // Slow down time
                time.timeScale /= 2;
                astorb.log("Time scale: " + time.timeScale.toExponential(1), "blue");
                astorb.refreshTimeControls();
                event.preventDefault();
                break;
            case '0':  // Reset time to 0
            case 'o':
            case 'O':
                time.simTime = 0;
                astorb.log("Time reset to 0", "blue");
                event.preventDefault();
                break;
        }
    };

    canvas.addEventListener('keydown', handleKeydown);
    window.addEventListener('keydown', handleKeydown);

    astorb.log("Controls: Drag to rotate, Scroll/pinch to zoom, Space=pause, Up/Down=speed, 0/O=reset time", "green");
    astorb.log("Click on canvas first to enable keyboard controls", "green");
};

astorb.setupTimeControls = function()
{
    var pauseButton = document.getElementById('pauseButton');
    var slowButton = document.getElementById('slowButton');
    var fastButton = document.getElementById('fastButton');
    var resetButton = document.getElementById('resetTimeButton');
    var invertButton = document.getElementById('invertTimeButton');

    if (pauseButton)
    {
        pauseButton.addEventListener('click', function() {
            astorb.time.paused = !astorb.time.paused;
            astorb.log("Time " + (astorb.time.paused ? "paused" : "resumed"), "blue");
            astorb.refreshTimeControls();
        });
    }

    if (slowButton)
    {
        slowButton.addEventListener('click', function() {
            astorb.time.timeScale /= 2;
            astorb.log("Time scale: " + astorb.time.timeScale.toExponential(1), "blue");
            astorb.refreshTimeControls();
        });
    }

    if (fastButton)
    {
        fastButton.addEventListener('click', function() {
            astorb.time.timeScale *= 2;
            astorb.log("Time scale: " + astorb.time.timeScale.toExponential(1), "blue");
            astorb.refreshTimeControls();
        });
    }

    if (resetButton)
    {
        resetButton.addEventListener('click', function() {
            astorb.time.simTime = 0;
            astorb.log("Time reset to 0", "blue");
            astorb.refreshTimeControls();
        });
    }

    if (invertButton)
    {
        invertButton.addEventListener('click', function() {
            astorb.time.timeScale = -astorb.time.timeScale;
            var directionLabel = astorb.time.timeScale >= 0 ? "Forward" : "Reverse";
            astorb.log("Time direction: " + directionLabel, "blue");
            astorb.refreshTimeControls();
        });
    }

    astorb.refreshTimeControls();
};

astorb.setupAsteroidControls = function()
{
    var halfButton = document.getElementById('asteroidHalfButton');
    var doubleButton = document.getElementById('asteroidDoubleButton');

    if (halfButton)
    {
        halfButton.addEventListener('click', function() {
            var total = astorb.asteroidCount || 0;
            if (!total) return;
            var current = astorb.asteroidDrawCount || total;
            var nextCount = Math.max(1, Math.floor(current / 2));
            astorb.asteroidDrawCount = nextCount;
            astorb.log("Asteroid draw count: " + astorb.formatNumber(nextCount) + " / " + astorb.formatNumber(total), "blue");
            astorb.refreshAsteroidControls();
        });
    }

    if (doubleButton)
    {
        doubleButton.addEventListener('click', function() {
            var total = astorb.asteroidCount || 0;
            if (!total) return;
            var current = astorb.asteroidDrawCount || total;
            var nextCount = Math.min(total, current * 2);
            astorb.asteroidDrawCount = nextCount;
            astorb.log("Asteroid draw count: " + astorb.formatNumber(nextCount) + " / " + astorb.formatNumber(total), "blue");
            astorb.refreshAsteroidControls();
        });
    }

    astorb.refreshAsteroidControls();
};

astorb.setupDepthBufferControls = function()
{
    var depthButton = document.getElementById('depthBufferButton');

    if (depthButton)
    {
        depthButton.addEventListener('click', function() {
            astorb.depthBufferEnabled = !astorb.depthBufferEnabled;
            astorb.applyDepthBufferState();
            astorb.refreshDepthBufferControls();
            astorb.log("Depth buffer " + (astorb.depthBufferEnabled ? "enabled" : "disabled"), "blue");
        });
    }

    astorb.refreshDepthBufferControls();
};

astorb.setupMotionBlurControls = function()
{
    var motionBlurButton = document.getElementById('motionBlurButton');

    if (motionBlurButton)
    {
        motionBlurButton.addEventListener('click', function() {
            astorb.motionBlur.enabled = !astorb.motionBlur.enabled;
            astorb.refreshMotionBlurControls();
            astorb.log("Motion blur " + (astorb.motionBlur.enabled ? "enabled" : "disabled"), "blue");
        });
    }

    astorb.refreshMotionBlurControls();
};

astorb.colorModes = [
    {id: 0, label: "Color: XYZ"},
    {id: 1, label: "Color: Orbit Shape"},
    {id: 2, label: "Color: Camera Depth"},
    {id: 3, label: "Color: Angular Velocity"},
    {id: 4, label: "Color: Orbital Energy"}
];
astorb.colorModeIndex = 3;

astorb.applyColorMode = function()
{
    var gl = astorb.gl;
    if (!gl || astorb.colorModeUniform === null) return;

    gl.useProgram(astorb.asteroidProgram);
    var mode = astorb.colorModes[astorb.colorModeIndex] || astorb.colorModes[0];
    gl.uniform1i(astorb.colorModeUniform, mode.id);
};

astorb.setupRenderColorControls = function()
{
    var renderButton = document.getElementById('renderColorButton');

    if (renderButton)
    {
        renderButton.addEventListener('click', function() {
            astorb.colorModeIndex = (astorb.colorModeIndex + 1) % astorb.colorModes.length;
            astorb.applyColorMode();
            astorb.refreshRenderColorControls();
        });
    }

    astorb.applyColorMode();
    astorb.refreshRenderColorControls();
};

astorb.stats = null;
astorb.initStats = function()
{
    if (typeof Stats === 'undefined') return;

    var stats = new Stats();
    stats.showPanel(0);
    stats.dom.style.position = 'fixed';
    stats.dom.style.top = '0';
    stats.dom.style.right = '0';
    stats.dom.style.left = 'auto';
    document.body.appendChild(stats.dom);
    astorb.stats = stats;
};

astorb.refreshTimeControls = function()
{
    var pauseButton = document.getElementById('pauseButton');
    var timeScaleLabel = document.getElementById('timeScaleLabel');
    var invertButton = document.getElementById('invertTimeButton');
    var timeScale = astorb.time.timeScale;
    var directionLabel = timeScale >= 0 ? "Forward" : "Reverse";
    var magnitude = Math.abs(timeScale);

    if (pauseButton)
    {
        pauseButton.textContent = astorb.time.paused ? "Resume" : "Pause";
    }

    if (timeScaleLabel)
    {
        timeScaleLabel.textContent = "Speed: " + magnitude.toExponential(1) + "x (" + directionLabel + ")";
    }

    if (invertButton)
    {
        invertButton.textContent = "Direction: " + directionLabel;
    }
};

astorb.refreshAsteroidControls = function()
{
    var halfButton = document.getElementById('asteroidHalfButton');
    var doubleButton = document.getElementById('asteroidDoubleButton');
    var asteroidCountLabel = document.getElementById('asteroidCountLabel');
    var total = astorb.asteroidCount || 0;
    var current = astorb.asteroidDrawCount || 0;

    if (asteroidCountLabel)
    {
        if (total)
        {
            var percent = astorb.formatAsteroidPercent(current, total);
            asteroidCountLabel.textContent = "Asteroids: " + astorb.formatNumber(current) + " / " +
                astorb.formatNumber(total) + " (" + percent + ")";
        }
        else
        {
            asteroidCountLabel.textContent = "Asteroids: --";
        }
    }

    if (halfButton)
    {
        halfButton.disabled = !total || current <= 1;
    }

    if (doubleButton)
    {
        doubleButton.disabled = !total || current >= total;
    }
};

astorb.refreshDepthBufferControls = function()
{
    var depthButton = document.getElementById('depthBufferButton');

    if (depthButton)
    {
        depthButton.textContent = "Depth: " + (astorb.depthBufferEnabled ? "On" : "Off");
    }
};

astorb.refreshMotionBlurControls = function()
{
    var motionBlurButton = document.getElementById('motionBlurButton');

    if (motionBlurButton)
    {
        motionBlurButton.textContent = "Motion Blur: " + (astorb.motionBlur.enabled ? "On" : "Off");
    }
};

astorb.refreshRenderColorControls = function()
{
    var renderButton = document.getElementById('renderColorButton');

    if (renderButton)
    {
        var mode = astorb.colorModes[astorb.colorModeIndex] || astorb.colorModes[0];
        renderButton.textContent = mode.label;
    }
};

astorb.updateViewMatrix = function()
{
    var gl = astorb.gl;
    var camera = astorb.camera;

    // Orbit camera: camera always looks at the origin (Sun).
    // The ecliptic plane is X-Y, and Z is perpendicular to the ecliptic (Z+ is "up").
    // azimuth = angle in the ecliptic plane (horizontal mouse movement), unlimited
    // elevation = angle above/below the ecliptic plane (vertical mouse movement), clamped to +/-80°
    // distance = AU from camera to origin

    // Clamp elevation to +/-80 degrees.
    var maxElev = camera.maxElevationRadians || (80.0 * Math.PI / 180.0);
    camera.elevation = Math.max(-maxElev, Math.min(maxElev, camera.elevation));

    // Wrap azimuth for numeric stability (keep it from growing unbounded).
    if (Math.abs(camera.azimuth) > Math.PI * 64)
    {
        camera.azimuth = ((camera.azimuth % (2.0 * Math.PI)) + 2.0 * Math.PI) % (2.0 * Math.PI);
        if (camera.azimuth > Math.PI) camera.azimuth -= 2.0 * Math.PI;
    }

    var azimuth = camera.azimuth;
    var elevation = camera.elevation;
    var r = camera.distance;

    // Spherical coordinates -> Cartesian camera position.
    // elevation = 0 means camera is in the X-Y plane.
    // azimuth = 0 means camera is on the +Y axis (looking toward origin along -Y).
    var cosElev = Math.cos(elevation);
    var sinElev = Math.sin(elevation);
    var sinAzi = Math.sin(azimuth);
    var cosAzi = Math.cos(azimuth);

    var eye = vec3.fromValues(
        r * cosElev * sinAzi,   // X
        r * cosElev * cosAzi,   // Y
        r * sinElev             // Z (up)
    );
    var center = vec3.fromValues(0.0, 0.0, 0.0);
    var up = vec3.fromValues(0.0, 0.0, 1.0);  // Z is up

    // Build a lookAt matrix.
    var f = vec3.create();
    vec3.subtract(f, center, eye);
    vec3.normalize(f, f);

    var s = vec3.create();
    vec3.cross(s, f, up);
    vec3.normalize(s, s);

    // Handle the degenerate case when looking straight up or down (f parallel to up).
    if (vec3.length(s) < 0.0001)
    {
        // Fallback: use Y as the right vector when looking along Z.
        s = vec3.fromValues(1.0, 0.0, 0.0);
    }

    var u = vec3.create();
    vec3.cross(u, s, f);

    var mvMatrix = mat4.create();
    // Column-major layout (gl-matrix).
    mvMatrix[0] = s[0];
    mvMatrix[1] = u[0];
    mvMatrix[2] = -f[0];
    mvMatrix[3] = 0;

    mvMatrix[4] = s[1];
    mvMatrix[5] = u[1];
    mvMatrix[6] = -f[1];
    mvMatrix[7] = 0;

    mvMatrix[8] = s[2];
    mvMatrix[9] = u[2];
    mvMatrix[10] = -f[2];
    mvMatrix[11] = 0;

    mvMatrix[12] = -vec3.dot(s, eye);
    mvMatrix[13] = -vec3.dot(u, eye);
    mvMatrix[14] = vec3.dot(f, eye);
    mvMatrix[15] = 1;

    astorb.cameraWorldPosition = [eye[0], eye[1], eye[2]];
    astorb.mvMatrix = mvMatrix;

    gl.useProgram(astorb.asteroidProgram);
    gl.uniformMatrix4fv(astorb.mvUniform, false, mvMatrix);

    if (astorb.bodyUniforms)
    {
        gl.useProgram(astorb.bodyProgram);
        gl.uniformMatrix4fv(astorb.bodyUniforms.mvMatrix, false, mvMatrix);
    }
};

astorb.animate = function(timestamp)
{
    var gl = astorb.gl;
    var asteroidCount = astorb.asteroidCount;
    var asteroidDrawCount = astorb.asteroidDrawCount || asteroidCount;
    var time = astorb.time;
    var stats = astorb.stats;
    var motionBlur = astorb.motionBlur;

    if (stats)
    {
        stats.begin();
    }

    // Keep buffer sized even if layout changes during animation.
    astorb.resizeWebGL();

    // Calculate delta time
    if (time.lastTimestamp === 0) {
        time.lastTimestamp = timestamp;
    }
    var deltaTime = (timestamp - time.lastTimestamp) / 1000.0;  // Convert to seconds
    time.lastTimestamp = timestamp;
    var simDelta = 0;

    // Update simulation time if not paused
    if (!time.paused) {
        simDelta = deltaTime * time.timeScale;
        time.simTime += simDelta;
    }

    // Update time uniform
    gl.useProgram(astorb.asteroidProgram);
    gl.uniform1f(astorb.timeUniform, time.simTime);

    astorb.updateBodies(time.simTime);

    // Update camera view matrix every frame
    astorb.updateViewMatrix();

    // Update status display
    astorb.frameCount++;
    if (astorb.frameCount % 10 === 0) {
        var statusDiv = document.getElementById('statusDisplay');
        if (statusDiv) {
            var years = time.simTime / (365.25 * 24 * 3600);  // Convert seconds to years
            var pauseStatus = time.paused ? "[PAUSED]" : "[RUNNING]";
            var directionLabel = time.timeScale >= 0 ? "Forward" : "Reverse";
            var percent = astorb.formatAsteroidPercent(asteroidDrawCount, asteroidCount);
            statusDiv.innerHTML = pauseStatus + " Time: " + years.toFixed(2) + " years | " +
                "Asteroids: " + astorb.formatNumber(asteroidDrawCount) + " / " + astorb.formatNumber(asteroidCount) +
                " (" + percent + ") | " +
                "Speed: " + Math.abs(time.timeScale).toExponential(1) + "x (" + directionLabel + ")";
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
        gl.useProgram(astorb.asteroidProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, astorb.planetOrbitBuffer);
        astorb.configureAttributePointers(gl);
        gl.uniform1f(astorb.timeUniform, 0);
        if (astorb.opacityUniform !== null)
        {
            gl.uniform1f(astorb.opacityUniform, 1.0);
        }

        for (var orbitIndex = 0; orbitIndex < astorb.planetOrbitOffsets.length; orbitIndex++)
        {
            var orbit = astorb.planetOrbitOffsets[orbitIndex];
            gl.drawArrays(gl.LINE_STRIP, orbit.start, orbit.count);
        }
    }

    if (astorb.dwarfPlanetOrbitBuffer)
    {
        gl.useProgram(astorb.asteroidProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, astorb.dwarfPlanetOrbitBuffer);
        astorb.configureAttributePointers(gl);
        gl.uniform1f(astorb.timeUniform, 0);
        if (astorb.opacityUniform !== null)
        {
            gl.uniform1f(astorb.opacityUniform, 0.9);
        }

        for (var dwarfOrbitIndex = 0; dwarfOrbitIndex < astorb.dwarfPlanetOrbitOffsets.length; dwarfOrbitIndex++)
        {
            var dwarfOrbit = astorb.dwarfPlanetOrbitOffsets[dwarfOrbitIndex];
            gl.drawArrays(gl.LINE_STRIP, dwarfOrbit.start, dwarfOrbit.count);
        }
    }

    if (astorb.bodyBuffer && astorb.bodyProgram)
    {
        gl.useProgram(astorb.bodyProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, astorb.bodyBuffer);

        var bodyAttributes = astorb.bodyAttributes;
        var stride = 7 * 4;
        gl.enableVertexAttribArray(bodyAttributes.position);
        gl.enableVertexAttribArray(bodyAttributes.radius);
        gl.enableVertexAttribArray(bodyAttributes.color);
        gl.vertexAttribPointer(bodyAttributes.position, 3, gl.FLOAT, false, stride, 0);
        gl.vertexAttribPointer(bodyAttributes.radius, 1, gl.FLOAT, false, stride, 12);
        gl.vertexAttribPointer(bodyAttributes.color, 3, gl.FLOAT, false, stride, 16);
        gl.uniform1f(astorb.bodyUniforms.pointScale, astorb.bodyScale);
        if (astorb.bodyUniforms.opacity !== null)
        {
            gl.uniform1f(astorb.bodyUniforms.opacity, 1.0);
        }

        gl.drawArrays(gl.POINTS, 0, astorb.bodyCount);
    }

    gl.useProgram(astorb.asteroidProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, astorb.astorbBuffer);
    astorb.configureAttributePointers(gl);
    var blurSamples = motionBlur.enabled ? motionBlur.sampleCount : 1;
    var blurSpan = 0;
    if (motionBlur.enabled && blurSamples > 1)
    {
        blurSpan = Math.min(motionBlur.maxSpanSeconds, Math.abs(simDelta) * motionBlur.spanMultiplier);
    }
    if (blurSpan === 0)
    {
        blurSamples = 1;
    }
    var blurActive = motionBlur.enabled && blurSamples > 1;
    for (var sampleIndex = 0; sampleIndex < blurSamples; sampleIndex++)
    {
        var sampleBlend = blurSamples > 1 ? (sampleIndex / (blurSamples - 1)) : 0;
        var sampleTime = time.simTime - (blurSpan * sampleBlend);
        var weight = blurActive ? (1.0 - sampleBlend) : 1.0;
        var opacity = blurActive ? (motionBlur.opacity * weight * weight) : 1.0;

        gl.uniform1f(astorb.timeUniform, sampleTime);
        if (astorb.opacityUniform !== null)
        {
            gl.uniform1f(astorb.opacityUniform, opacity);
        }
        gl.drawArrays(gl.POINTS, 0, asteroidDrawCount);
    }

    if (!astorb.firstFrameRendered && astorb.dataLoaded)
    {
        astorb.firstFrameRendered = true;
        window.__astorbFirstFrameRendered = true;
        document.dispatchEvent(new CustomEvent('astorb:first-frame'));
    }

    if (stats)
    {
        stats.end();
    }

    astorb.updateOrbitLabels();

    requestAnimationFrame(astorb.animate);
};
