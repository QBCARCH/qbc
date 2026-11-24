import json
class A:
    """sastavljac beleski u pikselima originalne slike; izlaz je u prostoru sirine 1366"""
    def __init__(s,W,H):
        s.k=1366/W;s.W=W;s.H=H;s.o=[]
    def P(s,x,y):return [round(x*s.k,1),round(y*s.k,1)]
    def v(s,n):return round(n*s.k,1)
    def axis(s,x,y1,y2,lab,c='ink'):s.o.append(['axis',s.v(x),s.v(y1),s.v(y2),lab,c])
    def note(s,x,y1,y2,lines,c='ink',side='r'):s.o.append(['note',s.v(x),s.v(y1),s.v(y2),lines,c,side])
    def noterot(s,x,y1,y2,t,c='ink'):s.o.append(['noterot',s.v(x),s.v(y1),s.v(y2),t,c])
    def dimv(s,x,y1,y2,t,c='ink'):s.o.append(['dimv',s.v(x),s.v(y1),s.v(y2),t,c])
    def dimh(s,x1,x2,y,t,c='ink'):s.o.append(['dimh',s.v(x1),s.v(x2),s.v(y),t,c])
    def level(s,x,y,t,c='ink'):s.o.append(['level',s.v(x),s.v(y),t,c])
    def line(s,pts,c='ink',amp=.7,over=False):s.o.append(['line',[s.P(*p) for p in pts],c,amp,over])
    def box(s,x1,y1,x2,y2,c='ink'):s.o.append(['box',s.v(x1),s.v(y1),s.v(x2),s.v(y2),c])
    def text(s,x,y,lines,c='ink',**o):s.o.append(['text',s.v(x),s.v(y),lines,c,o])
    def dash(s,x1,y1,x2,y2,c='ink'):s.o.append(['dash',s.v(x1),s.v(y1),s.v(x2),s.v(y2),c])
    def circ(s,x,y,r,c='ink'):s.o.append(['circ',s.v(x),s.v(y),s.v(r),c])
    # sitni crtezi u normalizovanom prostoru (velicina ne zavisi od slike)
    def at(s,x,y):return s.v(x),s.v(y)

def raw(s,pts,c='ink',amp=.6,over=False):
    s.o.append(['line',pts,c,amp,over])
A.raw=raw
def stack(s,x,y,w,n,c='ink'):
    """detalj: slojevi zida u preseku, w i dimenzije u normalizovanom prostoru"""
    ox,oy=s.v(x),s.v(y)
    for i in range(n):
        raw(s,[[ox+i*w,oy],[ox+i*w,oy+46]],c,.5)
    raw(s,[[ox,oy],[ox+n*w,oy],[ox+n*w,oy+46],[ox,oy+46],[ox,oy]],c,.6)
    for i in range(1,n*2):
        raw(s,[[ox+i*w/2,oy+46],[ox+i*w/2+8,oy+34]],c,.3)
A.stack=stack
def seam(s,x,y,n,c='ink'):
    ox,oy=s.v(x),s.v(y);p=[[ox,oy+20]];xx=ox
    for i in range(n):
        p+=[[xx+3,oy],[xx+8,oy],[xx+11,oy+20]];xx+=34;p.append([xx,oy+20])
    raw(s,p,c,.6)
A.seam=seam
def slats(s,x,y,n,c='ink'):
    ox,oy=s.v(x),s.v(y)
    for i in range(n):
        xx=ox+i*13;raw(s,[[xx,oy],[xx,oy+70]],c,.5);raw(s,[[xx-4,oy+[14,32,20,40,24,36,18,30][i%8]],[xx+4,oy+[14,32,20,40,24,36,18,30][i%8]]],c,.3)
    raw(s,[[ox,oy],[ox+(n-1)*13,oy]],c,.5);raw(s,[[ox,oy+70],[ox+(n-1)*13,oy+70]],c,.5)
A.slats=slats
