// astorb3d.js
// astorb3d
// by John Shaffstall
// Tuesday, October 16, 2013

(function() {
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    window.requestAnimationFrame = requestAnimationFrame;
})();

var astorb = astorb || {};

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
astorb.log("by John Shaffstall", "black");

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

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        gl.viewport(0.0, 0.0, canvas.width, canvas.height);

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
        astorb.log("Unable to initialize the shader program.", "red");
    }

    gl.useProgram(shaderProgram);
    astorb.shaderProgram = shaderProgram;

    var aSemimajorAxis = gl.getAttribLocation(shaderProgram, "aSemimajorAxis");
    var aEccentricity = gl.getAttribLocation(shaderProgram, "aEccentricity");
    var aInclination = gl.getAttribLocation(shaderProgram, "aInclination");
    var aArgumentOfPerihelion = gl.getAttribLocation(shaderProgram, "aArgumentOfPerihelion");
    var aLongitudeOfAscendingNode = gl.getAttribLocation(shaderProgram, "aLongitudeOfAscendingNode");
    var aMeanAnomaly = gl.getAttribLocation(shaderProgram, "aMeanAnomaly");

    gl.enableVertexAttribArray(aSemimajorAxis);
    gl.enableVertexAttribArray(aEccentricity);
    gl.enableVertexAttribArray(aInclination);
    gl.enableVertexAttribArray(aArgumentOfPerihelion);
    gl.enableVertexAttribArray(aLongitudeOfAscendingNode);
    gl.enableVertexAttribArray(aMeanAnomaly);

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

        var astorbBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, astorbBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, astorbFloats, gl.STATIC_DRAW);
        astorb.astorbBuffer = astorbBuffer;

        gl.vertexAttribPointer(astorb.aMeanAnomaly,             1, gl.FLOAT, false, 0, 0);
        gl.vertexAttribPointer(astorb.aArgumentOfPerihelion,    1, gl.FLOAT, false, 0, 4);
        gl.vertexAttribPointer(astorb.aLongitudeOfAscendingNode,1, gl.FLOAT, false, 0, 8);
        gl.vertexAttribPointer(astorb.aInclination,             1, gl.FLOAT, false, 0, 12);
        gl.vertexAttribPointer(astorb.aEccentricity,            1, gl.FLOAT, false, 0, 16);
        gl.vertexAttribPointer(astorb.aSemimajorAxis,           1, gl.FLOAT, false, 0, 20);

        astorb.frameCount = 0;
        requestAnimationFrame(astorb.animate);
    }
    else
    {
        astorb.log("failed to load astorb data", "red");
    }
};

astorb.initBuffers = function(gl)
{
    var canvas = astorb.canvas;
    var aspectRatio = canvas.width / canvas.height;

    var perspectiveMatrix = mat4.create();
    mat4.perspective(perspectiveMatrix, 90, aspectRatio, 0.005, 50.0);

    var identityMatrix = mat4.create();
    mat4.identity(identityMatrix);

    var mvMatrix = mat4.create();
    mat4.identity(mvMatrix);

    var translationVector = vec4.create();
    // vec4.set(translationVector, -950.0, -350.0, -380.0);
    vec4.set(translationVector, -0.0, -0.0, -1);
    mat4.translate(mvMatrix, identityMatrix, translationVector);

    var mvMatrixClone = mat4.clone(mvMatrix);
    mat4.rotateX(mvMatrix, mvMatrixClone, 0);

    // mvTranslate([-950.0, -350.0, -380.0]);
    // mvTranslate([-50.0, -50.0, -100.0]);

    var shaderProgram = astorb.shaderProgram;
    var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    gl.uniformMatrix4fv(pUniform, false, perspectiveMatrix);

    var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    gl.uniformMatrix4fv(mvUniform, false, mvMatrix);

    var timeUniform = gl.getUniformLocation(shaderProgram, "time");
    astorb.timeUniform = timeUniform;
};

astorb.animate = function()
{
    var gl = astorb.gl;
    var asteroidCount = astorb.asteroidCount;

    var timeUniform = astorb.timeUniform;

    var astorbBuffer = astorb.astorbBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, astorbBuffer);

    astorb.frameCount += 1;
    var frameCount = astorb.frameCount;

    gl.uniform1f(timeUniform, frameCount * 0.0001);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, asteroidCount);

    requestAnimationFrame(astorb.animate);
};
