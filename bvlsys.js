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

  // On each split, set some parameters to drive vessel look
  function calculateBifurcation(l0, d0) {
    var alpha = Math.random();

    console.log(`alpha: ${alpha}`);

    var cosTheta1 = ( Math.pow(1 + Math.pow(alpha, 3), 4/3) +                  1 - Math.pow(alpha, 4) ) / ( 2 * Math.pow(1+Math.pow(alpha, 3),2/3) );
    var cosTheta2 = ( Math.pow(1 + Math.pow(alpha, 3), 4/3) + Math.pow(alpha, 4) -                  1 ) / ( 2 * Math.pow(alpha, 2) * Math.pow(1+Math.pow(alpha, 3), 2/3));

    console.log(`cosTheta1: ${cosTheta1}`);
    console.log(`cosTheta2: ${cosTheta2}`);

    var denom = Math.pow(1+Math.pow(alpha, 3),1/3);
    var lambda1 = 1 / denom;
    var lambda2 = alpha / denom;
    var th1 = Math.acos(cosTheta1) * (180 / Math.PI);
    var th2 = Math.acos(cosTheta2) * (180 / Math.PI);
    var l1 = l0 * lambda1;
    var l2 = l0 * lambda2;
    var d1 = d0 * lambda1;
    var d2 = d0 * lambda2;

    console.log(" ");
    console.log("Calculate Bifurcation Results:");
    console.log(`    th1: ${th1}`);
    console.log(`    th2: ${th2}`);
    console.log(" ");

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
  var rules = {
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

  var blood = {
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
            break;
          case 1:
            return this.D(n-1,l0,d0) + `-(25.00)` + this.D(n-1,l0,d0) + `+(25.00)`
              + this.D(n-1,l0,d0) + `+(25.00)` + this.D(n-1,l0,d0) + `-(25.00)`
              + this.D(n-1,l0,d0);
            break;
        }
      } else {
        return `f(${l0/5},${d0})`;
      }
    },
    D: function(n, l0, d0) {
      return `f(${l0/5},${d0})`;
    }
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
    startPos = {x: window.innerWidth / 2, y: window.innerHeight / 2};
    startDir = {x: 0, y: 1};

    depth = 1;
    draw();

    document.body.addEventListener("keyup", function(event) {
      switch(event.keyCode) {
        case 32:
          depth += 1;
          draw();
          break;
        case 83:
          popImage();
      }
    });
  }

  // First generates the commands string, parses it, and draws the segments
  function draw() {

    // Clear canvas
    ctx.clearRect(0, 0, c.width, c.height);

    // Generate the commands string
    //var result = rules.F(depth, 100.00, 7);
    var result = blood.R(depth, startLength, startDiameter);

    // Generate the segments out of the commands
    interpret(result);

    console.dir(segments);

    // Iterate over segments and draw them
    segments.forEach(function(segment) {

      // A vector segment will be used for interpolating the arc drawings
      // across the branch segment
      var vector_segment = {
        x: segment.target.x - segment.origin.x,
        y: segment.target.y - segment.origin.y
      };

      // Longer segments will need more drawn circles. Different iteration count
      // will be driven by the length of the segment. The shorter segments will
      // instanciate less dots.
      var iterations = Math.sqrt(
        vector_segment.x * vector_segment.x + vector_segment.y * vector_segment.y
      );
      ctx.moveTo(segment.origin.x, segment.origin.y);
      for (i = 0; i <= iterations; i++) {

        // Linearly interpolate diameters and position of dots across the segment
        var x = segment.origin.x + (i / iterations) * vector_segment.x;
        var y = segment.origin.y + (i / iterations) * vector_segment.y;
        var diameter = segment.previous_diameter * (1 - (i / iterations)) +
          segment.diameter * (i / iterations);

        // Do the actual drawing
        ctx.beginPath();
        ctx.arc(x, y, diameter, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();
      }
    }); 
  }

  // Run the rules. Right now there is no axiom, you cannot run it against yet
  function interpret(commands) {

    // Reset the current segment information
    segments = [];

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
          i += perform_step(commands.slice(i, n), isFirstDrawn, isSegmentPart, isLastSegmentPart);
          isFirstDrawn = true;
          break;

        // Defines segment start... Diameter accross the segment will keep the
        // same after the first which will connect to the direct ancestor
        case '{':
          isFirstDrawn = false;
          isSegmentPart = true;
          isLastSegmentPart = false;
          break;

        // Segment is finished
        case '}':
          isSegmentPart = false;
          isFirstDrawn = true;
          isLastSegmentPart = true;
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
  function perform_step(substring, isFirstDrawn, isSegmentPart, isLastSegmentPart) {
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
    console.log(`Is last segment step: ${isLastSegmentPart}`)

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
      previous_diameter: previous_diameter
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