package resultservice

import (
	"encoding/binary"
	"math"
	"os"
)

// rasterNodata is the nodata sentinel written by the risk engine.
const rasterNodata = -9999.0

// rasterHasData reports whether an uncompressed float32 GeoTIFF contains any
// real (non-zero, non-nodata) pixel. It is used to hide empty component
// layers (e.g. fuel type where no fuel data covers the AOI) from the layer
// switcher. On any parsing uncertainty it returns true, so a layer is never
// hidden by mistake.
func rasterHasData(path string) bool {
	f, err := os.Open(path)
	if err != nil {
		return true
	}
	defer func() { _ = f.Close() }()

	header := make([]byte, 8)
	if _, err := f.ReadAt(header, 0); err != nil {
		return true
	}

	var bo binary.ByteOrder
	switch string(header[0:2]) {
	case "II":
		bo = binary.LittleEndian
	case "MM":
		bo = binary.BigEndian
	default:
		return true
	}
	if bo.Uint16(header[2:4]) != 42 {
		return true // not a classic TIFF (e.g. BigTIFF) — don't hide
	}

	ifdOffset := int64(bo.Uint32(header[4:8]))
	countBuf := make([]byte, 2)
	if _, err := f.ReadAt(countBuf, ifdOffset); err != nil {
		return true
	}
	numEntries := int(bo.Uint16(countBuf))

	// Read `count` integer values for a tag, from inline bytes or a pointed-to offset.
	readInts := func(typ uint16, count uint32, valOff []byte) []int64 {
		size := tiffTypeSize(typ) * int(count)
		var data []byte
		if size <= 4 {
			data = valOff
		} else {
			data = make([]byte, size)
			if _, err := f.ReadAt(data, int64(bo.Uint32(valOff))); err != nil {
				return nil
			}
		}
		out := make([]int64, 0, count)
		for i := 0; i < int(count); i++ {
			switch typ {
			case 3: // SHORT
				out = append(out, int64(bo.Uint16(data[i*2:])))
			case 4: // LONG
				out = append(out, int64(bo.Uint32(data[i*4:])))
			}
		}
		return out
	}

	var (
		bitsPerSample uint16
		sampleFormat  uint16 = 1
		stripOffsets  []int64
		stripCounts   []int64
	)

	entry := make([]byte, 12)
	for i := 0; i < numEntries; i++ {
		if _, err := f.ReadAt(entry, ifdOffset+2+int64(i*12)); err != nil {
			return true
		}
		tag := bo.Uint16(entry[0:2])
		typ := bo.Uint16(entry[2:4])
		count := bo.Uint32(entry[4:8])
		valOff := entry[8:12]

		switch tag {
		case 258: // BitsPerSample
			if v := readInts(typ, count, valOff); len(v) > 0 {
				bitsPerSample = uint16(v[0])
			}
		case 339: // SampleFormat
			if v := readInts(typ, count, valOff); len(v) > 0 {
				sampleFormat = uint16(v[0])
			}
		case 273: // StripOffsets
			stripOffsets = readInts(typ, count, valOff)
		case 279: // StripByteCounts
			stripCounts = readInts(typ, count, valOff)
		}
	}

	// Only the known producer format (32-bit IEEE float) is scanned; anything
	// else is treated as "has data" so it stays visible.
	if bitsPerSample != 32 || sampleFormat != 3 {
		return true
	}
	if len(stripOffsets) == 0 || len(stripOffsets) != len(stripCounts) {
		return true
	}

	for i := range stripOffsets {
		buf := make([]byte, stripCounts[i])
		if _, err := f.ReadAt(buf, stripOffsets[i]); err != nil {
			return true
		}
		for off := 0; off+4 <= len(buf); off += 4 {
			fv := float64(math.Float32frombits(bo.Uint32(buf[off:])))
			if math.IsNaN(fv) || fv == 0 || fv == rasterNodata {
				continue
			}
			return true
		}
	}
	return false
}

// tiffTypeSize returns the byte size of a TIFF field type.
func tiffTypeSize(typ uint16) int {
	switch typ {
	case 1, 2, 6, 7: // BYTE, ASCII, SBYTE, UNDEFINED
		return 1
	case 3, 8: // SHORT, SSHORT
		return 2
	case 4, 9, 11: // LONG, SLONG, FLOAT
		return 4
	case 5, 10, 12: // RATIONAL, SRATIONAL, DOUBLE
		return 8
	default:
		return 1
	}
}
