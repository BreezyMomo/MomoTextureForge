"""Verify actual browser downloads against independently sampled preview pixels."""
import argparse, hashlib, json, struct, zipfile, zlib
from pathlib import Path

def png(data):
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    offset, compressed = 8, bytearray()
    while offset < len(data):
        length = struct.unpack_from(">I", data, offset)[0]
        tag, body = data[offset+4:offset+8], data[offset+8:offset+8+length]
        assert zlib.crc32(tag+body) & 0xffffffff == struct.unpack_from(">I", data, offset+8+length)[0]
        if tag == b"IHDR":
            w,h,depth,color,compression,filtration,interlace=struct.unpack(">IIBBBBB",body)
            assert (depth,color,compression,filtration,interlace)==(8,6,0,0,0)
        if tag == b"IDAT": compressed.extend(body)
        offset += length+12
    raw=zlib.decompress(compressed);stride=w*4;out=bytearray(w*h*4)
    assert len(raw)==h*(stride+1)
    for y in range(h):
        mode=raw[y*(stride+1)];row=raw[y*(stride+1)+1:(y+1)*(stride+1)]
        for x,value in enumerate(row):
            left=out[y*stride+x-4] if x>=4 else 0
            up=out[(y-1)*stride+x] if y else 0
            corner=out[(y-1)*stride+x-4] if y and x>=4 else 0
            if mode==1:value+=left
            elif mode==2:value+=up
            elif mode==3:value+=(left+up)//2
            elif mode==4:
                p=left+up-corner;dist=[abs(p-left),abs(p-up),abs(p-corner)]
                value+=[left,up,corner][dist.index(min(dist))]
            else:assert mode==0
            out[y*stride+x]=value&255
    return w,h,bytes(out)

def verify(downloads,reference):
    results=[]
    with zipfile.ZipFile(reference) as refs:
        for m in json.loads(refs.read('manifest.json')):
            name,w,h,count=m['name'],m['width'],m['height'],m['count'];cols=min(m['columns'],count)
            aw,ah,atlas=png((downloads/(name+'-atlas.png')).read_bytes())
            assert (aw,ah)==(w*cols,h*((count+cols-1)//cols))
            max_error=0;semi=0;changes=0;last=None;matte_error=0
            with zipfile.ZipFile(downloads/(name+'-frames.zip')) as frames:
                assert frames.namelist()==[f'frame-{i:04d}.png' for i in range(count)]
                for i in range(count):
                    fw,fh,pixels=png(frames.read(f'frame-{i:04d}.png'));assert (fw,fh)==(w,h)
                    expected=refs.read(f'{name}/{i:04d}.rgba')
                    error=max(abs(a-b) for a,b in zip(pixels,expected));max_error=max(max_error,error)
                    assert error<=1,(name,i,error)
                    for y in range(h):
                        start=((i//cols*h+y)*aw+i%cols*w)*4
                        assert atlas[start:start+w*4]==pixels[y*w*4:(y+1)*w*4],(name,'atlas order',i)
                    for label,background in [('black',0),('white',255)]:
                        opaque=refs.read(f'{name}/{i:04d}-{label}.rgba')
                        for j in range(0,len(pixels),4):
                            alpha=pixels[j+3]/255
                            for k in range(3):
                                composite=round(pixels[j+k]*alpha+background*(1-alpha))
                                matte_error=max(matte_error,abs(composite-opaque[j+k]))
                    semi+=sum(0<a<255 for a in pixels[3::4])
                    if last is not None and pixels!=last:changes+=1
                    last=pixels
            for i in range(count,cols*((count+cols-1)//cols)):
                for y in range(h):
                    start=((i//cols*h+y)*aw+i%cols*w)*4
                    assert not any(atlas[start:start+w*4]),(name,'nontransparent padding')
            assert semi>0 and changes>0
            assert matte_error<=2,(name,'alpha compositing disagrees with opaque render',matte_error)
            results.append(dict(name=name,frames=count,max_channel_error=max_error,semi_transparent_pixels=semi,changed_transitions=changes,atlas_padding='transparent',matte_max_channel_error=matte_error))
    first=(downloads/'verify-flame-frames.zip').read_bytes();second=(downloads/'verify-flame-frames (1).zip').read_bytes()
    assert first==second,'Repeated export differs'
    return dict(result='passed',fixtures=results,repeat_sha256=hashlib.sha256(first).hexdigest())

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('downloads',type=Path);ap.add_argument('reference',type=Path);ap.add_argument('report',type=Path);a=ap.parse_args()
    report=verify(a.downloads,a.reference);a.report.write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
