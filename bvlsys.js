window.onload = function() {
  var c;
  var ctx;
  var depth;
  var segments = [];

  var startPos = {x: window.innerWidth / 2, y: 0};
  var startDir = {x: 0, y: 1};

  function calculateBifurcation(l0, d0) {
    return {
      d1: d0 * (0.4 + 0.6 * Math.random()),
      d2: d0 * (0.4 + 0.6 * Math.random()),
      th1: 30 + Math.random() * 10,
      th2: 30 + Math.random() * 5,
      l1: l0 * (0.5 + 0.5 * Math.random()),
      l2: l0 * (0.5 + 0.5 * Math.random())
    }
  }

  var rules = {
    F: function(n, l0, d0) {
      if (n > 0) {
        var params = calculateBifurcation(l0, d0);
        return `f(${l0},${d0})` + '[' + '+' + '(' + String(params.th1) + ')' + this.F(n-1, params.l1, params.d1) + ']' + '[' + '-' + '(' + String(params.th2) + ')' + this.F(n-1, params.l2, params.d2) +']';
      } else {
        return `f(${l0},${d0})`;
      }
    }
  };

  init();

  function init() {
    c = document.getElementById("canvas");
    ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    depth = 1;

    draw();

    document.body.addEventListener("keyup", function(event) {
      switch(event.keyCode) {
        case 32: // space
          depth += 1;
          draw();
          break;
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    segments = [];

    var result = rules.F(depth, 100.00, 7);
    interpret(result);

    segments.forEach(function(segment) {
      console.dir(segment);
      var whole = {x: segment.target.x - segment.origin.x, y: segment.target.y - segment.origin.y};
      var iterations = Math.sqrt(whole.x * whole.x + whole.y * whole.y);
      ctx.moveTo(segment.origin.x, segment.origin.y);
      for (i = 0; i <= iterations; i++) {
        var x = segment.origin.x + (i / iterations) * whole.x;
        var y = segment.origin.y + (i / iterations) * whole.y;
        var diameter = segment.prev_diameter * (1 - (i / iterations)) + segment.diameter * (i / iterations);
        ctx.beginPath();
        ctx.arc(x, y, diameter, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();
      }
    }); 
  }

  function interpret(commands) {
    var n = commands.length;
    console.log("Commands string: " + commands);
    console.log("Total length of commands string: " + n);

    var stateMachine = [];
    var currentState = JSON.parse(JSON.stringify({pos: startPos, dir: startDir, diameter: 1}));

    var i = 0;

    while (i < n) {
      var currentChar = commands.charAt(i);
      console.log("--------------------");
      console.log("Index:   " + i);
      console.log("Reading: " + currentChar);

      switch(currentChar) {
        case 'f':
          var substring = commands.slice(i, n);

          var patt = /f\((\d+\.*\d*),(\d+\.*\d*)\)/;
          var result = patt.exec(substring);

          var chars_read = result[0].length - 1;
          var seg_length = parseFloat(result[1]);
          var seg_diameter = parseFloat(result[2]);

          console.log("chars_read    " + chars_read);
          console.log("seg_length   " + seg_length);
          console.log("seg_diameter " + seg_diameter);

          currentState.diameter = seg_diameter;

          var prev_diameter;
          if (stateMachine.length < 1) {
            prev_diameter = 1.5 * seg_diameter;
          } else {
            prev_diameter = stateMachine[0].diameter;
          }
          console.log(`000000000--------->>>>`);
          console.log(seg_diameter);

          segments.push({
            origin: {
              x: currentState.pos.x,
              y: currentState.pos.y
            },
            target: {
              x: currentState.pos.x + currentState.dir.x * seg_length,
              y: currentState.pos.y + currentState.dir.y * seg_length
            },
            diameter: seg_diameter,
            prev_diameter: prev_diameter
          })

          currentState.pos.x += currentState.dir.x * seg_length;
          currentState.pos.y += currentState.dir.y * seg_length;

          i += chars_read;
          break;

        case '[':
          stateMachine.unshift(JSON.parse(JSON.stringify(currentState)));
          stateMachine.forEach(function(state) {
            console.log(`STATE pos(${state.pos.x}, ${state.pos.y}) dir(${state.dir.x}, ${state.dir.y})`);
          });
          break;

        case ']':
          currentState = JSON.parse(JSON.stringify(stateMachine.shift()));
          stateMachine.forEach(function(state) {
            console.log(`STATE pos(${state.pos.x}, ${state.pos.y}) dir(${state.dir.x}, ${state.dir.y})`);
          });
          break;

        case '+':
          var substring = commands.slice(i, n);

          var patt = /\+\((\d+\.*\d*)\)/;
          var result = patt.exec(substring);

          var chars_read = result[0].length - 1;
          var rotation = result[1];

          console.log("Rotation   " + rotation);

          var radians = rotation * Math.PI / 180;

          var cos = Math.cos(radians);
          var sin = Math.sin(radians);

          var prevX = currentState.dir.x;
          var prevY = currentState.dir.y;

          currentState.dir.x = prevX * cos - prevY * sin;
          currentState.dir.y = prevX * sin + prevY * cos;

          i += chars_read;
          break;

        case '-':
          var substring = commands.slice(i, n);

          var patt = /-\((\d+\.*\d*)\)/;
          var result = patt.exec(substring);

          var chars_read = result[0].length - 1;
          var rotation = -result[1];

          console.log("Rotation   " + rotation);

          var radians = rotation * Math.PI / 180;

          var cos = Math.cos(radians);
          var sin = Math.sin(radians);

          var prevX = currentState.dir.x;
          var prevY = currentState.dir.y;

          currentState.dir.x = prevX * cos - prevY * sin;
          currentState.dir.y = prevX * sin + prevY * cos;

          i += chars_read;
          break;
      }

      i += 1;
    }


  }
}