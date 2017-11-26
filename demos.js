
var geometry = new VoxelGeometry(4, 1, 2);
var palette = new VoxelPalette();
palette.setEntryShaded(0, 0x000000);
palette.setEntryShaded(1, 0xedc9af);

/**
 * Draw a cube.
 */
function demoDrawCube(canvas, cubeWidth, cubeHeight, cubeDepth) {
    w = parseInt(cubeWidth);
    h = parseInt(cubeHeight);
    d = parseInt(cubeDepth);
    
    var surface = new VoxelSurface(canvas, geometry, palette, w, h, d);

    surface.fill(1, 0, 0, 0, w, h, d);

    surface.update(true);

    var context = canvas.getContext("2d");
    context.putImageData(surface.imageData, 0, 0);
}

/**
 * Draw a pyramid. 
 */
function demoDrawPyramid(canvas, width, height, depth) {
    w = parseInt(width);
    h = parseInt(height);
    d = parseInt(depth);

    var surface = new VoxelSurface(canvas, geometry, palette, w, h, d);
    var x = 0;
    var y = 0;
    var z = 0;
    while (w > 0 && d > 0 && y < h) {
        surface.fill(1, x, y, z, w, 1, d);

        x++;
        y++;
        z++;
        w -= 2;
        d -= 2;
    }

    surface.update(true);

    var context = canvas.getContext("2d");
    context.putImageData(surface.imageData, 0, 0);
}

/**
 * Draw an ellipsoid.
 */
function demoDrawEllipsoid(canvas, width, height, depth) {
    w = parseInt(width);
    h = parseInt(height);
    d = parseInt(depth);

    var surface = new VoxelSurface(canvas, geometry, palette, w, h, d);

    var x = width / 2;
    var y = height / 2;
    var z = depth / 2;
    for (var i = 0; i < w; i++) {
        for( var j = 0; j < h; j++) {
            for (var k = 0; k < d; k++) {
                var q = (i - x) * (i - x) / (x * x) + (j - y) * (j - y) / (y * y) + (k - z) * (k - z) / (z * z);
                if (q <= 1.0) {
                    surface.setVoxel(1, i, j, k);
                }
            }
        }
    }

    surface.update(true);

    var context = canvas.getContext("2d");
    context.putImageData(surface.imageData, 0, 0);
}
