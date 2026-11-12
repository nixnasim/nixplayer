"""Regenerates build/appx/* (Microsoft Store icons) from build/icon.png, build/icon.ico and build/file-*.ico.
Run:  python scripts/make-appx-assets.py      (needs Pillow)
- Square44x44Logo targetsize + "unplated" variants: no black plate behind the icon in the taskbar / Open with / Start list
- tile / logo scale variants
- file-<ext>.png (+ targetsize variants): the icon with the format label (MP4, MKV, SRT ...) that Explorer shows for each file type
"""
import os, glob
from PIL import Image
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B=os.path.join(ROOT,'build'); OUT=os.path.join(B,'appx'); os.makedirs(OUT,exist_ok=True)
png=Image.open(os.path.join(B,'icon.png')).convert('RGBA')
ico=Image.open(os.path.join(B,'icon.ico'))
def frame(icopath,n):
    im=Image.open(icopath)
    sizes=sorted(im.ico.sizes())
    if (n,n) in sizes: return im.ico.getimage((n,n)).convert('RGBA')
    big=[s for s in sizes if s[0]>=n]; s=big[0] if big else sizes[-1]
    return im.ico.getimage(s).convert('RGBA').resize((n,n),Image.LANCZOS)
def square(n): 
    if n in (16,24,32,48,64,128,256): return frame(os.path.join(B,'icon.ico'),n)
    return png.resize((n,n),Image.LANCZOS)
def wide(w,h,fill=0.8):
    c=Image.new('RGBA',(w,h),(0,0,0,0)); s=int(h*fill); i=png.resize((s,s),Image.LANCZOS); c.paste(i,((w-s)//2,(h-s)//2),i); return c
SC=(100,125,150,200,400)
# --- 44x44 app icon: every size the shell asks for, with and without a plate
for n in (16,24,32,48,64,96,128,256):
    im=square(n)
    for suffix in ('',"_altform-unplated","_altform-lightunplated"):
        im.save(os.path.join(OUT,f'Square44x44Logo.targetsize-{n}{suffix}.png'))
base={'Square44x44Logo':(44,44),'Square71x71Logo':(71,71),'Square150x150Logo':(150,150),'Square310x310Logo':(310,310),'StoreLogo':(50,50)}
for name,(w,h) in base.items():
    square(w).save(os.path.join(OUT,name+'.png'))
    for s in SC: square(round(w*s/100)).save(os.path.join(OUT,f'{name}.scale-{s}.png'))
for name,(w,h),fill in (('Wide310x150Logo',(310,150),0.8),('SplashScreen',(620,300),0.7)):
    wide(w,h,fill).save(os.path.join(OUT,name+'.png'))
    for s in SC: wide(round(w*s/100),round(h*s/100),fill).save(os.path.join(OUT,f'{name}.scale-{s}.png'))
# --- one icon per file type, with the format label
n=0
for f in sorted(glob.glob(os.path.join(B,'file-*.ico'))):
    ext=os.path.basename(f)[5:-4]
    for s in (16,24,32,48,64,128,256):
        frame(f,s).save(os.path.join(OUT,f'file-{ext}.targetsize-{s}.png'))
    frame(f,256).save(os.path.join(OUT,f'file-{ext}.png')); n+=1
print('app icons done;',n,'file-type icons;',len(os.listdir(OUT)),'files in',OUT)
