/**
 * Describes the geometry of a rendered voxel.
 * 
 * A rendered voxel is a rectangle. It can be divided into a top and bottom
 * sub-rectangle.
 * 
 * It looks like this:
 * 
 * *-----------*
 * |   Top     |
 * <-- width -->
 * |  Bottom   |
 * *-----------*
 * 
 * The top and bottom both have a height component in pixels, and share the
 * same overall width in pixels.
 * 
 * The top pixels represent the upward (Y+) facing side of the voxel cube.
 * The bottom pixels represent the side (X-/Z-) facing side of the voxel cube.
 * 
 * By varying the width and heights of these rectangles, a different perspective
 * can be achieved when rendering.
 * 
 * Width must be a multiple of two for the code to work properly.
 */
class VoxelGeometry {
    constructor(width, topHeight, bottomHeight) {
        this.width = width;
        this.topHeight = topHeight;
        this.bottomHeight = bottomHeight;
    }

    get height() {
        return this.topHeight + this.bottomHeight;
    }
}

var VoxelFace = {
    TOP : 0,
    LEFT : 1,
    RIGHT : 2,
    TOP2 : 3
};

/**
 * A 16-bit palette for rendering voxels.
 */
class VoxelPalette {
    constructor() {
        const paletteFaces = 4; // 4 face colors per palette entry
        const paletteBits = 16;

        // Multiplied by 3 for each of the color components (r,g,b)
        //
        const paletteSize = (1 << paletteBits) * paletteFaces * 3;

        this.buffer = new Array(paletteSize);
    }

    static paletteIndex(voxel, face) {
        return voxel * 4 * 3 + face * 3;
    }

    getEntryR(voxel, face) {
        const index = VoxelPalette.paletteIndex(voxel, face);
        return this.buffer[index];
    }
    
    getEntryG(voxel, face) {
        const index = VoxelPalette.paletteIndex(voxel, face) + 1;
        return this.buffer[index];
    }

    getEntryB(voxel, face) {
        const index = VoxelPalette.paletteIndex(voxel, face) + 2;
        return this.buffer[index];
    }

    setEntry(voxel, face, pixel) {
        const index = VoxelPalette.paletteIndex(voxel, face);
        const r = (pixel >> 16) & 0xff;
        const g = (pixel >> 8) & 0xff;
        const b = pixel & 0xff;
        this.buffer[index] = r;
        this.buffer[index + 1] = g;
        this.buffer[index + 2] = b;
    }

    setEntryR(voxel, face, r) {
        const index = VoxelPalette.paletteIndex(voxel, face);
        this.buffer[index] = r;
    }

    setEntryG(voxel, face, g) {
        const index = VoxelPalette.paletteIndex(voxel, face) + 1;
        this.buffer[index] = g;
    }

    setEntryB(voxel, face, b) {
        const index = VoxelPalette.paletteIndex(voxel, face) + 2;
        this.buffer[index] = b;
    }

    setEntryShaded(voxel, pixel) {
        this.setEntry(voxel, VoxelFace.TOP2, pixel);

        const r = (pixel >> 16) & 0xff;
        const g = (pixel >> 8) & 0xff;
        const b = pixel & 0xff;

        this.setEntryR(voxel, VoxelFace.LEFT, r / 2 | 0);
        this.setEntryG(voxel, VoxelFace.LEFT, g / 2 | 0);
        this.setEntryB(voxel, VoxelFace.LEFT, b / 2 | 0);

        this.setEntryR(voxel, VoxelFace.RIGHT, r / 4 | 0);
        this.setEntryG(voxel, VoxelFace.RIGHT, g / 4 | 0);
        this.setEntryB(voxel, VoxelFace.RIGHT, b / 4 | 0);

        this.setEntryR(voxel, VoxelFace.TOP, (r / 4 * 3) | 0);
        this.setEntryG(voxel, VoxelFace.TOP, (g / 4 * 3) | 0);
        this.setEntryB(voxel, VoxelFace.TOP, (b / 4 * 3) | 0);
    }
}

class VoxelSurface {
    constructor(canvas, geometry, palette, width, height, depth) {
        this.geometry = geometry;
        this.palette = palette;
        this.width = width;
        this.height = height;
        this.depth = depth;

        this.voxelBuffer = new Array(this.width * this.height * this.depth);

        this.pixelBufferWidth = this.geometry.width + 
            (this.geometry.width / 2) * ((this.width - 1) + (this.depth - 1));
        
        this.pixelBufferHeight = this.geometry.height +
            ((this.width - 1) + (this.depth - 1)) * this.geometry.topHeight +
            (this.height - 1) * this.geometry.bottomHeight;

        
        // Each pixel has 4 components (r,g,b,a)
        //
        this.pixelBufferSize = this.pixelBufferWidth * this.pixelBufferHeight * 4;

        // Use an ImageData object to store the rendering
        //
        var context = canvas.getContext("2d");
        this.imageData = context.createImageData(this.pixelBufferWidth, this.pixelBufferHeight);
        this.pixelBuffer = this.imageData.data;

        this.clear();
    }

    voxelIndex(x, y, z) {
        return z * this.width * this.height + y * this.width + x;
    }

    pixelIndex(x, y, z) {
        var px;
        if (this.width != this.depth) {
            // The x origin is skewed when the width is not equal to the depth of the surface
            //
            px = (this.width - 1) * (this.geometry.width / 2) + (z - x) * (this.geometry.width / 2);
        } else {
            px = ((this.pixelBufferWidth / 2) - (this.geometry.width / 2) + (z - x) * (this.geometry.width / 2));
        }
        const py = ((this.pixelBufferHeight - this.geometry.height - (z + x) * this.geometry.topHeight - y * this.geometry.bottomHeight));

        // Multipled by 4 for the 4 color components
        //
        return (py * this.pixelBufferWidth + px) * 4;
    }

    fill(value, x, y, z, w, h, d) {
        for (var k = z; k < z + d; k++) {
            for (var j = y; j < y + h; j++) {
                for (var i = x; i < x + w; i++) {
                    const index = this.voxelIndex(i, j, k);
                    this.voxelBuffer[index] = value;
                }
            }
        }

        this.dirty = true;
    }

    clear() {
        this.fill(0, 0, 0, 0, this.width, this.height, this.depth);
    }

    setVoxel(value, x, y, z) {
        const index = this.voxelIndex(x, y, z);
        this.voxelBuffer[index] = value;

        this.dirty = true;
    }

    update(transparentBg) {
        // Only update if the buffer has not changed
        //
        if (!this.dirty) {
            return;
        }

        // Clear the buffer with the clear color
        //
        const clearR = this.palette.getEntryR(0, 0);
        const clearG = this.palette.getEntryG(0, 0);
        const clearB = this.palette.getEntryB(0, 0);
        const clearA = transparentBg ? 0x00 : 0xff;
        for (var i = 0; i < this.pixelBufferSize; i += 4) {
            this.pixelBuffer[i] = clearR;
            this.pixelBuffer[i + 1] = clearG;
            this.pixelBuffer[i + 2] = clearB;
            this.pixelBuffer[i + 3] = clearA;
        }

        // Render each voxel
        //
        for (var k = this.depth - 1; k >= 0; k--) {
            for (var j = 0; j < this.height; j++) {
                for (var i = this.width - 1; i >= 0; i--) {
                    const vIndex = this.voxelIndex(i, j, k);
                    var v = this.voxelBuffer[vIndex];
                    if (v == 0) {
                        // Skip clear voxels
                        //
                        continue;
                    }

                    var r = 0;
                    var g = 0;
                    var b = 0;
                    var pIndex = this.pixelIndex(i, j, k);

                    // Top face pixels
                    //
                    const behindIndex = this.voxelIndex(i + 1, j, k + 1);
                    if (i >= this.width - 1 || k >= this.depth - 1 || this.voxelBuffer[behindIndex] == 0) {
                        r = this.palette.getEntryR(v, VoxelFace.TOP2);
                        g = this.palette.getEntryG(v, VoxelFace.TOP2);
                        b = this.palette.getEntryB(v, VoxelFace.TOP2);
                    } else {
                        r = this.palette.getEntryR(v, VoxelFace.TOP);
                        g = this.palette.getEntryG(v, VoxelFace.TOP);
                        b = this.palette.getEntryB(v, VoxelFace.TOP);
                    }
                    for (var m = 0; m < this.geometry.topHeight; m++) {
                        for (var n = 0; n < this.geometry.width; n++) {
                            this.pixelBuffer[pIndex + n * 4] = r;
                            this.pixelBuffer[pIndex + n * 4 + 1] = g;
                            this.pixelBuffer[pIndex + n * 4 + 2] = b;
                            this.pixelBuffer[pIndex + n * 4 + 3] = 0xff;
                        }

                        // Next row
                        //
                        pIndex += this.pixelBufferWidth * 4;
                    }

                    // Left/right face pixels
                    //
                    r = this.palette.getEntryR(v, VoxelFace.LEFT);
                    g = this.palette.getEntryG(v, VoxelFace.LEFT);
                    b = this.palette.getEntryB(v, VoxelFace.LEFT);
                    var r2 = this.palette.getEntryR(v, VoxelFace.RIGHT);
                    var g2 = this.palette.getEntryG(v, VoxelFace.RIGHT);
                    var b2 = this.palette.getEntryB(v, VoxelFace.RIGHT);
                    for (var m = 0; m < this.geometry.bottomHeight; m++) {
                        // Left face
                        //
                        for (var n = 0; n < this.geometry.width / 2 | 0; n++) {
                            this.pixelBuffer[pIndex + n * 4] = r;
                            this.pixelBuffer[pIndex + n * 4 + 1] = g;
                            this.pixelBuffer[pIndex + n * 4 + 2] = b;
                            this.pixelBuffer[pIndex + n * 4 + 3] = 0xff;
                        }
                        // Right face
                        //
                        for (var n = this.geometry.width / 2 | 0; n < this.geometry.width; n++) {
                            this.pixelBuffer[pIndex + n * 4] = r2;
                            this.pixelBuffer[pIndex + n * 4 + 1] = g2;
                            this.pixelBuffer[pIndex + n * 4 + 2] = b2;
                            this.pixelBuffer[pIndex + n * 4 + 3] = 0xff;
                        }

                        // Next row
                        //
                        pIndex += this.pixelBufferWidth * 4;
                    }
                }
            }
        }

        this.dirty = false;
    }
}

