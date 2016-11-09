// Runs when page loads
window.onload = function() {
  // Gloabl variable declaration

  var c,             // will hold the canvas DOM object
      ctx,           // will carry the context of the canvas
      currentState,  // the actual state containing pos, dir, diameter
      depth,         // depth of recursion
      segments,      // array containing all the segments that need to be drawn
      startLength,   // initial length of the root segment
      startDiameter, // initial diameter of the root segment
      startPos,      // from where to start drawing
      startDir,      // what direction the first segment should be aiming to
      stateStack;    // all the states will be appended at the begining

  var web_position_offset = {x: window.innerWidth / 2, y: window.innerHeight / 2};
  var web_scale_multiplier = 1;

  var points_for_houdini = [];
  var pscale_for_houdini = [];

  // On each split, set some parameters to drive vessel look
  function calculateBifurcation(l0, d0) {
    var alpha = Math.random();

    var cosTheta1 = ( Math.pow(1 + Math.pow(alpha, 3), 4/3) +                  1 - Math.pow(alpha, 4) ) / ( 2 * Math.pow(1+Math.pow(alpha, 3),2/3) );
    var cosTheta2 = ( Math.pow(1 + Math.pow(alpha, 3), 4/3) + Math.pow(alpha, 4) -                  1 ) / ( 2 * Math.pow(alpha, 2) * Math.pow(1+Math.pow(alpha, 3), 2/3));

    var denom = Math.pow(1+Math.pow(alpha, 3),1/3);
    var lambda1 = 1 / denom;
    var lambda2 = alpha / denom;
    var th1 = Math.acos(cosTheta1) * (180 / Math.PI);
    var th2 = Math.acos(cosTheta2) * (180 / Math.PI);
    var l1 = l0 * lambda1;
    var l2 = l0 * lambda2;
    var d1 = d0 * lambda1;
    var d2 = d0 * lambda2;

    return {
      d1: d1,
      d2: d2,
      th1: th1,
      th2: th2,
      l1: l1,
      l2: l2
    }
  }

  // The L-System rulesets
  var tree = {
    F: function(n, l0, d0) {
      if (n > 0) {
        var params = calculateBifurcation(l0, d0);
        return `f(${l0},${d0})` + '[' + '+' + '(' + String(params.th1) + ')' +
          this.F(n-1, params.l1, params.d1) + ']' + '[' + '-' +
          '(' + String(params.th2) + ')' + this.F(n-1, params.l2, params.d2) +']';
      } else {
        return `f(${l0},${d0})`;
      }
    }
  };

  var bv1 = {
    R: function(n, l0, d0) {
      if (n > 0) {
        var parms = calculateBifurcation(l0, d0);
        return `[-(70.00)` + this.F(n-1,l0,d0) + `][+(70.00)` + this.F(n-1,l0,d0) +
          `]+(70)` + this.F(n-1,l0,d0);
      } else {
        return `f(${l0/5},${d0})`;
      }
    },
    F: function(n, l0, d0) {
      if (n > 0) {
        var parms = calculateBifurcation(l0, d0);
        return `{` + this.S(n-1,l0,d0) + `}[+(${parms.th1})` + this.F(n-1,l0,parms.d1) +
          `][-(${parms.th2})` + this.F(n-1,l0,parms.d2) + `]`;
      } else {
        return `f(${l0/5},${d0})`;
      }
    },
    S: function(n, l0, d0) {
      if (n > 0) {
        var choice = Math.floor(2 * Math.random());
        switch (choice) {
          case 0:
            return this.D(n-1,l0,d0) + `+(25.00)` + this.D(n-1,l0,d0) + `-(25.00)`
              + this.D(n-1,l0,d0) + `-(25.00)` + this.D(n-1,l0,d0) + `+(25.00)`
              + this.D(n-1,l0,d0);
          case 1:
            return this.D(n-1,l0,d0) + `-(25.00)` + this.D(n-1,l0,d0) + `+(25.00)`
              + this.D(n-1,l0,d0) + `+(25.00)` + this.D(n-1,l0,d0) + `-(25.00)`
              + this.D(n-1,l0,d0);
        }
      } else {
        return `f(${l0/5},${d0})`;
      }
    },
    D: function(n, l0, d0) {
      return `f(${l0/5},${d0})`;
    }
  }

  var rulesets = {
    'tree': tree,
    'bv1': bv1
  }

  init();

  // Sets up a rendering context in HTML5's canvas, draws, and increses
  // recursivity depth on hitting spacebar.
  function init() {
    c = document.getElementById("canvas");
    ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    c.width = window.innerWidth;
    c.height = window.innerHeight;

    startLength = 50.0;
    startDiameter = 4.0;
    startPos = {x: 0, y: 0};
    startDir = {x: 0, y: 1};

    depth = 1;
    draw();

    document.body.addEventListener("keyup", function(event) {
      console.log(`key pressed: ${event.keyCode}`);
      switch(event.keyCode) {
        case 32: // spacebar
          depth += 1;
          draw();
          break;
        case 83: // s
          popImage();
          break;
        case 74: // j
          generate_json(points_for_houdini, pscale_for_houdini);
          break

      }
    });
  }

  function saveText(text, filename){
    var a = document.createElement('a');
    a.setAttribute('href', 'data:text/plain;charset=utf-u,'+encodeURIComponent(text));
    a.setAttribute('download', filename);
    a.click()
  }



  // First generates the commands string, parses it, and draws the segments
  function draw() {
    points_for_houdini = [];
    pscale_for_houdini = [];

    // Clear canvas
    ctx.clearRect(0, 0, c.width, c.height);

    // Generate the commands string
    var result = rulesets.bv1.R(depth, startLength, startDiameter);

    // Generate the segments out of the commands
    interpret(result);

    console.dir(segments);

    var segIdx = 0
    while (segIdx < segments.length) {
      // check if part of segment
      if (segments[segIdx].segment_id !== 0 && segments[segIdx+1].segment_id !== 0) {
        var segmentsToProcess = [];
        var j = 1;
        while (segments[segIdx + j].segment_id !== 0) {
          segmentsToProcess.push(segments[j]);
          j += 1;
        }

        var flattenedPositions = [];
        flattenedPositions.push(segmentsToProcess[0].origin.x);
        flattenedPositions.push(segmentsToProcess[0].origin.y);

        segmentsToProcess.forEach(function (segmentToProcess) {
          flattenedPositions.push(segmentToProcess.target.x);
          flattenedPositions.push(segmentToProcess.target.y);
        });

        console.log("*.*.*.*.*.*.*.*.*");

        console.dir(flattenedPositions);
        var smoothedPoints = getCurvePoints(flattenedPositions, 1.0, 100, false);
        console.log("*.*.*.*.*.*.*.*.*");

        ctx.moveTo(smoothedPoints[0], smoothedPoints[1]);



        for (i = 0; i < smoothedPoints.length / 2; i++) {
          ctx.beginPath();
          ctx.arc(
            web_position_offset.x + smoothedPoints[2 * i],
            web_position_offset.y + smoothedPoints[2 * i + 1],
            2.0,
            0,
            2 * Math.PI
          );
          ctx.fill();
          ctx.closePath();

        points_for_houdini.push([smoothedPoints[2*i], smoothedPoints[2*i+1], 0.0]);
        pscale_for_houdini.push(4.0);
        }

        // skip all the processed
        segIdx += j;
      } else {
        // A vector segment will be used for interpolating the arc drawings
        // across the branch segment
        var vector_segment = {
          x: segments[segIdx].target.x - segments[segIdx].origin.x,
          y: segments[segIdx].target.y - segments[segIdx].origin.y
        };

        // Longer segments will need more drawn circles. Different iteration count
        // will be driven by the length of the segment. The shorter segments will
        // instanciate less dots.
        var iterations = Math.sqrt(
          vector_segment.x * vector_segment.x + vector_segment.y * vector_segment.y
        );

        ctx.moveTo(segments[segIdx].origin.x, segments[segIdx].origin.y);

        for (i = 0; i <= iterations; i++) {

          // Linearly interpolate diameters and position of dots across the segment
          var x = segments[segIdx].origin.x + (i / iterations) * vector_segment.x;
          var y = segments[segIdx].origin.y + (i / iterations) * vector_segment.y;
          var diameter = segments[segIdx].previous_diameter * (1 - (i / iterations)) +
            segments[segIdx].diameter * (i / iterations);

          // Do the actual drawing
          ctx.beginPath();
          ctx.arc( web_position_offset.x + x, web_position_offset.y + y, diameter, 0, 2 * Math.PI);

          points_for_houdini.push([x, y, 0.0]);
          pscale_for_houdini.push(diameter);

          ctx.fill();
          ctx.closePath();
        }
        segIdx += 1;
      }
    }

  }

  function generate_json(points_for_houdini, pscale_for_houdini) {
    var json = [
      "pointcount",pscale_for_houdini.length,
      "vertexcount",0,
      "primitivecount",0,
      "topology",[
        "pointref",[
          "indices",[]
        ]
      ],
      "attributes",[
        "pointattributes",[
          [
            [
              "type","numeric",
              "name","P",
            ],
            [
              "size",3,
              "defaults",[
                "size",3,
                "storage","fpreal64",
              ],
              "values",[
                "size",3,
                "storage","fpreal32",
                "tuples",points_for_houdini
              ]
            ]
          ],
          [
            [
              "type","numeric",
              "name","pscale",
            ],
            [
              "size",1,
              "storage","fpreal32",
              "defaults",[
                "size",1,
                "storage","fpreal64",
              ],
              "values",[
                "size",1,
                "storage","fpreal32",
                "arrays",[pscale_for_houdini]
              ]
            ]
          ]
        ]
      ]
    ];

    saveText(JSON.stringify(json), 'geometry.json');
  }

  // Run the rules. Right now there is no axiom, you cannot run it against yet
  function interpret(commands) {

    // Reset the current segment information
    segments = [];

    // To group various segments and interpolate them
    var segmentId = 0;

    // Get the character length of the string of commands for parsing purpose
    var n = commands.length;

    console.log("Commands: " + commands);
    console.log("Total length of commands string: " + n);

    // States will be pushed to the front of this array
    stateStack = [];
    currentState = JSON.parse(JSON.stringify(
        {pos: startPos, dir: startDir, diameter: startDiameter}
    ));

    var i = 0;
    var isFirstDrawn = false;
    var isSegmentPart = true;
    var isLastSegmentPart = false;
    var segmentsDrawn = 0;
    while (i < n) {
      var currentChar = commands.charAt(i);
      console.log("----");
      console.log("Reading: " + currentChar);
      console.log("Index:   " + i);

      switch(currentChar) {
        // Perform step on f(length, diameter), parameters are captured with]
        // regex. The returned value is used to walk passed the already parsed
        // characters.
        case 'f':
          i += perform_step(commands.slice(i, n), isFirstDrawn, isSegmentPart, isLastSegmentPart, segmentId);
          isFirstDrawn = true;
          break;

        // Defines segment start... Diameter accross the segment will keep the
        // same after the first which will connect to the direct ancestor
        case '{':
          isFirstDrawn = false;
          isSegmentPart = true;
          isLastSegmentPart = false;
          segmentsDrawn += 1;
          segmentId = segmentsDrawn;
          break;

        // Segment is finished
        case '}':
          isSegmentPart = false;
          isFirstDrawn = true;
          isLastSegmentPart = true;
          segmentId = 0;
          console.log("Finish segment");
          break;

        // Push a state to the start of the stack
        case '[':
          stateStack.unshift(JSON.parse(JSON.stringify(currentState)));
          console.log(`Pushed state. Now ${stateStack.length} states.`);
          break;

        // Pop a state from the start of the stack
        case ']':
          currentState = JSON.parse(JSON.stringify(stateStack.shift()));
          console.log(`Popped state. Now ${stateStack.length} states.`);
          break;

        // Clockwise rotation. The returned value makes the iterator skip the
        // parsed characters.
        case '+':
          i += turn(commands.slice(i, n), 'clockwise');
          break;

        // Counterclockwise rotation. The returned value is used to skip the 
        // iterator to the end of the parsed characters.
        case '-':
          i += turn(commands.slice(i, n), 'counterclockwise');
          break;
      }
      i += 1;
    }
  }

  // Makes turtle walk
  function perform_step(substring, isFirstDrawn, isSegmentPart, isLastSegmentPart, segmentId) {
    var pattern = /f\((\d+\.*\d*),(\d+\.*\d*)\)/;
    var result = pattern.exec(substring);

    var characters_read  = result[0].length - 1;
    var segment_length   = parseFloat(result[1]);
    var segment_diameter = parseFloat(result[2]);

    console.log(`Characters Read:      ${characters_read}`  );
    console.log(`Parsed Length:        ${segment_length}`   );
    console.log(`Parsed Diameter:      ${segment_diameter}` );
    console.log(`Is first drawn:       ${isFirstDrawn}`     );
    console.log(`Is part of segment:   ${isSegmentPart}`    );
    console.log(`Is last segment step: ${isLastSegmentPart}`);
    console.log(`SegmentId:            ${segmentId}`        );

    // Needs to be done so that we can access parent branch diameters
    currentState.diameter = segment_diameter;

    if (isSegmentPart && isFirstDrawn) {
      previous_diameter = segment_diameter;

    } else {
      var previous_diameter;
      if (stateStack.length < 1) {
        previous_diameter = segment_diameter; // root branch
      } else {
        previous_diameter = stateStack[0].diameter;
      }
    }


    // Pushes the segment so it can be drawn later on the draw() function
    segments.push({
      origin: {
        x: currentState.pos.x,
        y: currentState.pos.y
      },
      target: {
        x: currentState.pos.x + currentState.dir.x * segment_length,
        y: currentState.pos.y + currentState.dir.y * segment_length
      },
      diameter: segment_diameter,
      previous_diameter: previous_diameter,
      segment_id: segmentId
    })

    // Update the current position of the turtle
    currentState.pos.x += currentState.dir.x * segment_length;
    currentState.pos.y += currentState.dir.y * segment_length;

    return characters_read;
  }

  // Turns the turtle
  function turn(substring, direction) {
    var pattern = /(\+|-)\((\d+\.*\d*)\)/;
    var result = pattern.exec(substring);

    var characters_read = result[0].length - 1;
    var rotation = result[2];
    var sign = result[1];

    console.log(`Rotation: ${sign}${rotation}`);

    var radians = rotation * Math.PI / 180;
    radians = parseFloat(`${sign}${radians}`);

    var cos = Math.cos(radians);
    var sin = Math.sin(radians);

    var prevX = currentState.dir.x;
    var prevY = currentState.dir.y;

    currentState.dir.x = prevX * cos - prevY * sin;
    currentState.dir.y = prevX * sin + prevY * cos;

    return characters_read;
  }

  // Generates a png image out of the canvas
  function popImage() {
    var win = window.open("", "Canvas Image");
    var src = this.canvas.toDataURL("image/png");
    win.document.write("<img src='" + src 
      + "' width='" + this.width 
      + "' height='" + this.height + "'/>");
  }
}
