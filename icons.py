from PIL import Image, ImageDraw
import math
def base(s):
    S=s*4
    im=Image.new("RGB",(S,S))
    d=ImageDraw.Draw(im)
    top=(15,32,64); bot=(14,116,128)
    for y in range(S):
        t=y/S; d.line([(0,y),(S,y)],fill=tuple(int(top[i]+(bot[i]-top[i])*t) for i in range(3)))
    return im,d,S
def clock(s):
    im,d,S=base(s); c=S/2; r=S*0.30; w=int(S*0.055)
    d.ellipse([c-r,c-r,c+r,c+r],outline="white",width=w)
    d.line([(c,c),(c,c-r*0.62)],fill="white",width=w)
    d.line([(c,c),(c+r*0.45,c+r*0.25)],fill="white",width=w)
    d.ellipse([c-w*0.8,c-w*0.8,c+w*0.8,c+w*0.8],fill="white")
    return im.resize((s,s),Image.LANCZOS)
def check(s):
    im,d,S=base(s); w=int(S*0.075)
    pts=[(S*0.28,S*0.52),(S*0.44,S*0.67),(S*0.73,S*0.36)]
    d.line(pts,fill="white",width=w,joint="curve")
    for p in (pts[0],pts[2]): d.ellipse([p[0]-w/2,p[1]-w/2,p[0]+w/2,p[1]+w/2],fill="white")
    return im.resize((s,s),Image.LANCZOS)
for name,fn in (("dochazka",clock),("ukoly",check)):
    for s in (180,192,512):
        fn(s).save(f"{name}/icon-{s}.png")
