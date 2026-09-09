import{n as e,s as t,t as n}from"./jsx-runtime-B5yqYJvp.js";import{R as r,i,ot as a,s as o,tt as s,ut as c,z as l}from"./astro-QGMX6gAK.js";import{i as u,n as d,o as f,r as p,s as m,t as h}from"./starShader--iAuqh9K.js";var g=t(e(),1),_=n();function v(){let e=(0,g.useRef)({progress:0,px:0,py:0,active:0});return(0,g.useEffect)(()=>{let t=()=>{let t=document.documentElement.scrollHeight-window.innerHeight;e.current.progress=t>0?Math.min(1,Math.max(0,window.scrollY/t)):0},n=t=>{e.current.px=t.clientX/window.innerWidth*2-1,e.current.py=-(t.clientY/window.innerHeight*2-1),e.current.active=1},r=()=>{e.current.active=0};return t(),window.addEventListener(`scroll`,t,{passive:!0}),window.addEventListener(`resize`,t),window.addEventListener(`pointermove`,n,{passive:!0}),window.addEventListener(`pointerleave`,r),()=>{window.removeEventListener(`scroll`,t),window.removeEventListener(`resize`,t),window.removeEventListener(`pointermove`,n),window.removeEventListener(`pointerleave`,r)}},[]),e}function y(){return(0,g.useMemo)(()=>typeof window>`u`?!1:window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,[])}var b=`
  varying vec2 vUv;
  varying vec2 vNdc;
  void main() {
    vUv = uv;
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // Normalised device coords let the fragment stage measure distance to the
    // pointer in screen space, which is what "near the cursor" means to a user.
    vNdc = clip.xy / clip.w;
    gl_Position = clip;
  }
`,x=`
  uniform sampler2D uMap;
  uniform float uBrightness;
  uniform float uAlpha;
  uniform float uGamma;
  uniform float uFeather;
  uniform float uSaturation;
  uniform float uGlow;
  uniform vec2  uPointer;
  uniform float uAspect;
  uniform float uReact;
  varying vec2 vUv;
  varying vec2 vNdc;

  void main() {
    // Gaussian falloff around the cursor. Aspect correction keeps the
    // influence circular rather than stretched on wide viewports.
    vec2 delta = (vNdc - uPointer) * vec2(uAspect, 1.0);
    float infl = exp(-dot(delta, delta) * 2.2) * uReact;

    // Push the cloud gently outward from the cursor, so it visibly parts.
    vec2 dir = normalize(vUv - 0.5 + 1e-5);
    vec2 uv = vUv + dir * infl * 0.045;

    vec4 t = texture2D(uMap, uv);

    // Sampling a deliberately coarse mip gives a blurred copy for free —
    // the chain is already built. Adding it back is a bloom in one fetch,
    // where an EffectComposer pass measured 83ms per frame.
    vec3 glow = texture2D(uMap, uv, 4.5).rgb;

    // These plates sit on black sky, so luminance doubles as an alpha mask:
    // the cloud survives and the background drops out instead of showing a
    // rectangle. Gamma controls how hard the faint outskirts fade.
    float lum = dot(t.rgb, vec3(0.299, 0.587, 0.114));

    // The mask must account for the blurred copy as well as the sharp one.
    // Keying alpha off the sharp image alone meant a dark pixel beside a
    // bright region was masked to zero, so the glow was multiplied away and
    // no halo ever appeared — the one thing bloom actually does.
    float glum = dot(glow, vec3(0.299, 0.587, 0.114));
    float mask = pow(clamp(max(lum, glum * uGlow), 0.0, 1.0), uGamma);

    // Feather the plate edges so nothing reads as a photograph border.
    float edge = smoothstep(0.5, uFeather, length(uv - 0.5));

    // Additive blending and ACES both pull toward grey; push the plate's own
    // colour back out before it reaches the composer.
    // Soft-knee the halo so bright cores spread instead of clipping to a
    // flat white disc.
    vec3 haze = glow * uGlow;
    haze = haze / (1.0 + haze * 0.85);
    vec3 col = mix(vec3(lum), t.rgb, uSaturation) + haze;

    float a = mask * edge * uAlpha * (1.0 + infl * 0.9);
    gl_FragColor = vec4(col * uBrightness * (1.0 + infl * 1.6), a);
  }
`,S=Promise.resolve();function C(){return new Promise(e=>requestAnimationFrame(()=>e()))}function w(e,t,n){let[i,o]=(0,g.useState)(null);return(0,g.useEffect)(()=>{if(!t||i)return;let c=!1;return S=S.then(async()=>{if(!c)try{let t=await fetch(e);if(!t.ok||c)return;let i=await t.blob(),u=await createImageBitmap(i);if(c){u.close();return}let d=new a(u);d.colorSpace=s,d.generateMipmaps=!0,d.minFilter=l,d.magFilter=r,d.anisotropy=n,d.needsUpdate=!0,o(d),await C(),await C()}catch{}}),()=>{c=!0}},[e,t,i,n]),i}var T=(0,g.memo)(function({slug:e,x:t,y:n,z:r,scale:a,spin:o,brightness:s=1.8,alpha:l=.9,gamma:u=1.2,feather:d=.1,saturation:p=1.5,glow:h=.9,react:v=1,active:y,input:S,reduced:C}){let T=(0,g.useRef)(null),{size:E,gl:D}=m(),O=(0,g.useMemo)(()=>D.capabilities.getMaxAnisotropy(),[D]),k=w(i(`nebulae/hd/${e}.webp`),y,O),A=(0,g.useMemo)(()=>({uMap:{value:k},uBrightness:{value:s},uAlpha:{value:l},uGamma:{value:u},uFeather:{value:d},uSaturation:{value:p},uGlow:{value:h},uPointer:{value:new c(0,0)},uAspect:{value:1},uReact:{value:0}}),[k,s,l,u,d,p,h]),j=(0,g.useRef)({x:0,y:0,a:0}),M=(0,g.useRef)(0);return f((e,t)=>{if(!T.current)return;let n=e.clock.elapsedTime,i=S.current,a=1-.002**t;j.current.x+=(i.px-j.current.x)*a,j.current.y+=(i.py-j.current.y)*a,j.current.a+=((C?0:i.active)-j.current.a)*a,A.uPointer.value.set(j.current.x,j.current.y),A.uAspect.value=E.width/Math.max(1,E.height),A.uReact.value=j.current.a*v,M.current+=(+!!k-M.current)*(1-.02**t),A.uAlpha.value=l*M.current;let s=e.camera.position.z-r;T.current.visible=s>-40&&s<260,T.current.rotation.z=C?0:n*o}),k?(0,_.jsxs)(`mesh`,{ref:T,position:[t,n,r],scale:[a,a,1],children:[(0,_.jsx)(`planeGeometry`,{args:[1,1]}),(0,_.jsx)(`shaderMaterial`,{vertexShader:b,fragmentShader:x,uniforms:A,transparent:!0,depthWrite:!1,depthTest:!1,blending:2})]}):null});function E({count:e,depth:t,reduced:n}){let r=(0,g.useRef)(null),{positions:i,colors:a,scales:s,phases:c}=(0,g.useMemo)(()=>{let n=new Float32Array(e*3),r=new Float32Array(e*3),i=new Float32Array(e),a=new Float32Array(e);for(let s=0;s<e;s++){n[s*3]=(Math.random()-.5)*260,n[s*3+1]=(Math.random()-.5)*190,n[s*3+2]=20-Math.random()*(t+120);let[e,c,l]=o(-.32+Math.random()*1.9);r[s*3]=e,r[s*3+1]=c,r[s*3+2]=l,i[s]=Math.random()<.04?2.4+Math.random()*2.2:.5+Math.random()*1.2,a[s]=Math.random()}return{positions:n,colors:r,scales:i,phases:a}},[e,t]),l=(0,g.useMemo)(()=>p({scale:1.15,spikes:.6,halo:.4,twinkle:.3}),[]);return f(e=>{r.current&&!n&&(r.current.uniforms.uTime.value=e.clock.elapsedTime)}),(0,_.jsxs)(`points`,{frustumCulled:!1,children:[(0,_.jsxs)(`bufferGeometry`,{children:[(0,_.jsx)(`bufferAttribute`,{attach:`attributes-position`,args:[i,3]}),(0,_.jsx)(`bufferAttribute`,{attach:`attributes-aColor`,args:[a,3]}),(0,_.jsx)(`bufferAttribute`,{attach:`attributes-aScale`,args:[s,1]}),(0,_.jsx)(`bufferAttribute`,{attach:`attributes-aPhase`,args:[c,1]})]}),(0,_.jsx)(`shaderMaterial`,{ref:r,vertexShader:d,fragmentShader:h,uniforms:l,transparent:!0,depthWrite:!1,blending:2})]})}var D=620,O=[{slug:`horsehead`,x:-4,y:1,z:-40,scale:72,spin:.006,brightness:4.6,alpha:1,gamma:.9,saturation:1.5,feather:.07,react:1},{slug:`carina`,x:-44,y:16,z:-122,scale:78,spin:-.005,brightness:4,alpha:.9,gamma:1.05,react:.9},{slug:`lagoon`,x:42,y:-16,z:-198,scale:76,spin:.004,brightness:4,alpha:.88,gamma:1.1,react:.9},{slug:`eagle`,x:-30,y:-22,z:-272,scale:70,spin:.006,brightness:4.1,alpha:.86,gamma:1.05,react:.95},{slug:`andromeda`,x:24,y:20,z:-348,scale:86,spin:.003,brightness:3.6,alpha:.9,gamma:.95,react:1},{slug:`helix`,x:-34,y:-14,z:-420,scale:44,spin:-.01,brightness:3.6,alpha:.9,gamma:1,react:1.2},{slug:`orion`,x:20,y:10,z:-494,scale:72,spin:.005,brightness:3.8,alpha:.86,gamma:1.25,saturation:1.55,react:1},{slug:`crab`,x:-26,y:20,z:-566,scale:52,spin:.008,brightness:3.5,alpha:.84,gamma:1.15,react:1.1},{slug:`flame`,x:22,y:-10,z:-636,scale:68,spin:-.004,brightness:2.9,alpha:.78,gamma:1.4,react:.9}];function k({input:e,reduced:t}){let n=(0,g.useRef)(0);return f((r,i)=>{let a=e.current,o=1-8e-4**i;n.current+=(a.progress-n.current)*o;let s=r.camera;s.position.z=24-n.current*D;let c=t?0:a.px*7*a.active,l=t?0:a.py*4.5*a.active;s.position.x+=(c-s.position.x)*(1-.004**i),s.position.y+=(l-s.position.y)*(1-.004**i),s.lookAt(0,0,s.position.z-60)}),null}function A({input:e,reduced:t}){let n=m(e=>e.size.width)<768,r=n?.6:1,[i,a]=(0,g.useState)(0);return(0,g.useEffect)(()=>{let t=setInterval(()=>{let t=e.current?.progress??0;a(e=>Math.abs(t-e)>.02?t:e)},250);return()=>clearInterval(t)},[e]),(0,_.jsxs)(_.Fragment,{children:[(0,_.jsx)(E,{count:n?700:1700,depth:D,reduced:t}),O.map(n=>{let a=(24-n.z)/D;return(0,_.jsx)(T,{...n,x:n.x*r,y:n.y*r,scale:n.scale*r,active:i>a-.3,input:e,reduced:t},n.slug)}),(0,_.jsx)(k,{input:e,reduced:t})]})}function j({className:e=``}){let t=v(),n=y();return(0,_.jsxs)(`div`,{className:`fixed inset-0 z-0 pointer-events-none ${e}`,"aria-hidden":`true`,children:[(0,_.jsx)(u,{camera:{position:[0,0,24],fov:62,near:.1,far:1200},dpr:[1,1.4],gl:{antialias:!1,alpha:!0,powerPreference:`high-performance`,toneMapping:4,toneMappingExposure:1.25},style:{background:`transparent`},children:(0,_.jsx)(A,{input:t,reduced:n})}),(0,_.jsx)(`div`,{className:`absolute inset-0 pointer-events-none`,style:{background:`radial-gradient(ellipse 100% 90% at 50% 45%, transparent 0%, rgba(5,5,8,0.03) 68%, rgba(5,5,8,0.42) 100%)`}})]})}export{j as NebulaJourney};