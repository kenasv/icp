import{bd as de,be as We,bf as fe,bg as he,bh as me,bi as It,bj as Ne,b9 as ke,ba as ye,g as Ve,s as Pe,o as Re,n as ze,a as Be,b as He,_ as l,c as ct,j as pt,bk as je,bl as qe,bm as Xe,d as Ge,E as Ue,bn as j,l as nt,bo as te,bp as ee,bq as Ke,br as Je,bs as Ze,bt as Qe,bu as ti,bv as ei,bw as ii,bx as ie,by as se,bz as ne,bA as re,bB as ae,k as si,K as ni,p as ri,x as ai,bC as oi,bD as ci}from"./index-CWJC3K1y.js";const li=Math.PI/180,ui=180/Math.PI,wt=18,ge=.96422,pe=1,ve=.82521,be=4/29,lt=6/29,Te=3*lt*lt,di=lt*lt*lt;function xe(t){if(t instanceof Q)return new Q(t.l,t.a,t.b,t.opacity);if(t instanceof it)return we(t);t instanceof de||(t=We(t));var e=$t(t.r),i=$t(t.g),s=$t(t.b),r=Mt((.2225045*e+.7168786*i+.0606169*s)/pe),h,y;return e===i&&i===s?h=y=r:(h=Mt((.4360747*e+.3850649*i+.1430804*s)/ge),y=Mt((.0139322*e+.0971045*i+.7141733*s)/ve)),new Q(116*r-16,500*(h-r),200*(r-y),t.opacity)}function fi(t,e,i,s){return arguments.length===1?xe(t):new Q(t,e,i,s??1)}function Q(t,e,i,s){this.l=+t,this.a=+e,this.b=+i,this.opacity=+s}fe(Q,fi,he(me,{brighter(t){return new Q(this.l+wt*(t??1),this.a,this.b,this.opacity)},darker(t){return new Q(this.l-wt*(t??1),this.a,this.b,this.opacity)},rgb(){var t=(this.l+16)/116,e=isNaN(this.a)?t:t+this.a/500,i=isNaN(this.b)?t:t-this.b/200;return e=ge*At(e),t=pe*At(t),i=ve*At(i),new de(Ft(3.1338561*e-1.6168667*t-.4906146*i),Ft(-.9787684*e+1.9161415*t+.033454*i),Ft(.0719453*e-.2289914*t+1.4052427*i),this.opacity)}}));function Mt(t){return t>di?Math.pow(t,1/3):t/Te+be}function At(t){return t>lt?t*t*t:Te*(t-be)}function Ft(t){return 255*(t<=.0031308?12.92*t:1.055*Math.pow(t,1/2.4)-.055)}function $t(t){return(t/=255)<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)}function hi(t){if(t instanceof it)return new it(t.h,t.c,t.l,t.opacity);if(t instanceof Q||(t=xe(t)),t.a===0&&t.b===0)return new it(NaN,0<t.l&&t.l<100?0:NaN,t.l,t.opacity);var e=Math.atan2(t.b,t.a)*ui;return new it(e<0?e+360:e,Math.sqrt(t.a*t.a+t.b*t.b),t.l,t.opacity)}function Yt(t,e,i,s){return arguments.length===1?hi(t):new it(t,e,i,s??1)}function it(t,e,i,s){this.h=+t,this.c=+e,this.l=+i,this.opacity=+s}function we(t){if(isNaN(t.h))return new Q(t.l,0,0,t.opacity);var e=t.h*li;return new Q(t.l,Math.cos(e)*t.c,Math.sin(e)*t.c,t.opacity)}fe(it,Yt,he(me,{brighter(t){return new it(this.h,this.c,this.l+wt*(t??1),this.opacity)},darker(t){return new it(this.h,this.c,this.l-wt*(t??1),this.opacity)},rgb(){return we(this).rgb()}}));function mi(t){return function(e,i){var s=t((e=Yt(e)).h,(i=Yt(i)).h),r=It(e.c,i.c),h=It(e.l,i.l),y=It(e.opacity,i.opacity);return function(w){return e.h=s(w),e.c=r(w),e.l=h(w),e.opacity=y(w),e+""}}}const ki=mi(Ne);function yi(t){return t}var bt=1,Lt=2,Wt=3,vt=4,oe=1e-6;function gi(t){return"translate("+t+",0)"}function pi(t){return"translate(0,"+t+")"}function vi(t){return e=>+t(e)}function bi(t,e){return e=Math.max(0,t.bandwidth()-e*2)/2,t.round()&&(e=Math.round(e)),i=>+t(i)+e}function Ti(){return!this.__axis}function _e(t,e){var i=[],s=null,r=null,h=6,y=6,w=3,L=typeof window<"u"&&window.devicePixelRatio>1?0:.5,A=t===bt||t===vt?-1:1,F=t===vt||t===Lt?"x":"y",W=t===bt||t===Wt?gi:pi;function x(T){var R=s??(e.ticks?e.ticks.apply(e,i):e.domain()),N=r??(e.tickFormat?e.tickFormat.apply(e,i):yi),I=Math.max(h,0)+w,z=e.range(),K=+z[0]+L,B=+z[z.length-1]+L,G=(e.bandwidth?bi:vi)(e.copy(),L),q=T.selection?T.selection():T,M=q.selectAll(".domain").data([null]),g=q.selectAll(".tick").data(R,e).order(),k=g.exit(),$=g.enter().append("g").attr("class","tick"),f=g.select("line"),b=g.select("text");M=M.merge(M.enter().insert("path",".tick").attr("class","domain").attr("stroke","currentColor")),g=g.merge($),f=f.merge($.append("line").attr("stroke","currentColor").attr(F+"2",A*h)),b=b.merge($.append("text").attr("fill","currentColor").attr(F,A*I).attr("dy",t===bt?"0em":t===Wt?"0.71em":"0.32em")),T!==q&&(M=M.transition(T),g=g.transition(T),f=f.transition(T),b=b.transition(T),k=k.transition(T).attr("opacity",oe).attr("transform",function(p){return isFinite(p=G(p))?W(p+L):this.getAttribute("transform")}),$.attr("opacity",oe).attr("transform",function(p){var v=this.parentNode.__axis;return W((v&&isFinite(v=v(p))?v:G(p))+L)})),k.remove(),M.attr("d",t===vt||t===Lt?y?"M"+A*y+","+K+"H"+L+"V"+B+"H"+A*y:"M"+L+","+K+"V"+B:y?"M"+K+","+A*y+"V"+L+"H"+B+"V"+A*y:"M"+K+","+L+"H"+B),g.attr("opacity",1).attr("transform",function(p){return W(G(p)+L)}),f.attr(F+"2",A*h),b.attr(F,A*I).text(N),q.filter(Ti).attr("fill","none").attr("font-size",10).attr("font-family","sans-serif").attr("text-anchor",t===Lt?"start":t===vt?"end":"middle"),q.each(function(){this.__axis=G})}return x.scale=function(T){return arguments.length?(e=T,x):e},x.ticks=function(){return i=Array.from(arguments),x},x.tickArguments=function(T){return arguments.length?(i=T==null?[]:Array.from(T),x):i.slice()},x.tickValues=function(T){return arguments.length?(s=T==null?null:Array.from(T),x):s&&s.slice()},x.tickFormat=function(T){return arguments.length?(r=T,x):r},x.tickSize=function(T){return arguments.length?(h=y=+T,x):h},x.tickSizeInner=function(T){return arguments.length?(h=+T,x):h},x.tickSizeOuter=function(T){return arguments.length?(y=+T,x):y},x.tickPadding=function(T){return arguments.length?(w=+T,x):w},x.offset=function(T){return arguments.length?(L=+T,x):L},x}function xi(t){return _e(bt,t)}function wi(t){return _e(Wt,t)}var De={exports:{}};(function(t,e){(function(i,s){t.exports=s()})(ke,function(){var i="day";return function(s,r,h){var y=function(A){return A.add(4-A.isoWeekday(),i)},w=r.prototype;w.isoWeekYear=function(){return y(this).year()},w.isoWeek=function(A){if(!this.$utils().u(A))return this.add(7*(A-this.isoWeek()),i);var F,W,x,T,R=y(this),N=(F=this.isoWeekYear(),W=this.$u,x=(W?h.utc:h)().year(F).startOf("year"),T=4-x.isoWeekday(),x.isoWeekday()>4&&(T+=7),x.add(T,i));return R.diff(N,"week")+1},w.isoWeekday=function(A){return this.$utils().u(A)?this.day()||7:this.day(this.day()%7?A:A-7)};var L=w.startOf;w.startOf=function(A,F){var W=this.$utils(),x=!!W.u(F)||F;return W.p(A)==="isoweek"?x?this.date(this.date()-(this.isoWeekday()-1)).startOf("day"):this.date(this.date()-1-(this.isoWeekday()-1)+7).endOf("day"):L.bind(this)(A,F)}}})})(De);var _i=De.exports;const Di=ye(_i);var Ce={exports:{}};(function(t,e){(function(i,s){t.exports=s()})(ke,function(){var i,s,r=1e3,h=6e4,y=36e5,w=864e5,L=31536e6,A=2628e6,F=/^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/,W=/\[([^\]]+)]|YYYY|YY|Y|M{1,2}|D{1,2}|H{1,2}|m{1,2}|s{1,2}|SSS/g,x={years:L,months:A,days:w,hours:y,minutes:h,seconds:r,milliseconds:1,weeks:6048e5},T=function(M){return M instanceof G},R=function(M,g,k){return new G(M,k,g.$l)},N=function(M){return s.p(M)+"s"},I=function(M){return M<0},z=function(M){return I(M)?Math.ceil(M):Math.floor(M)},K=function(M){return Math.abs(M)},B=function(M,g){return M?I(M)?{negative:!0,format:""+K(M)+g}:{negative:!1,format:""+M+g}:{negative:!1,format:""}},G=function(){function M(k,$,f){var b=this;if(this.$d={},this.$l=f,k===void 0&&(this.$ms=0,this.parseFromMilliseconds()),$)return R(k*x[N($)],this);if(typeof k=="number")return this.$ms=k,this.parseFromMilliseconds(),this;if(typeof k=="object")return Object.keys(k).forEach(function(a){b.$d[N(a)]=k[a]}),this.calMilliseconds(),this;if(typeof k=="string"){var p=k.match(F);if(p){var v=p.slice(2).map(function(a){return a!=null?Number(a):0});return this.$d.years=v[0],this.$d.months=v[1],this.$d.weeks=v[2],this.$d.days=v[3],this.$d.hours=v[4],this.$d.minutes=v[5],this.$d.seconds=v[6],this.calMilliseconds(),this}}return this}var g=M.prototype;return g.calMilliseconds=function(){var k=this;this.$ms=Object.keys(this.$d).reduce(function($,f){return $+(k.$d[f]||0)*x[f]},0)},g.parseFromMilliseconds=function(){var k=this.$ms;this.$d.years=z(k/L),k%=L,this.$d.months=z(k/A),k%=A,this.$d.days=z(k/w),k%=w,this.$d.hours=z(k/y),k%=y,this.$d.minutes=z(k/h),k%=h,this.$d.seconds=z(k/r),k%=r,this.$d.milliseconds=k},g.toISOString=function(){var k=B(this.$d.years,"Y"),$=B(this.$d.months,"M"),f=+this.$d.days||0;this.$d.weeks&&(f+=7*this.$d.weeks);var b=B(f,"D"),p=B(this.$d.hours,"H"),v=B(this.$d.minutes,"M"),a=this.$d.seconds||0;this.$d.milliseconds&&(a+=this.$d.milliseconds/1e3,a=Math.round(1e3*a)/1e3);var d=B(a,"S"),m=k.negative||$.negative||b.negative||p.negative||v.negative||d.negative,u=p.format||v.format||d.format?"T":"",S=(m?"-":"")+"P"+k.format+$.format+b.format+u+p.format+v.format+d.format;return S==="P"||S==="-P"?"P0D":S},g.toJSON=function(){return this.toISOString()},g.format=function(k){var $=k||"YYYY-MM-DDTHH:mm:ss",f={Y:this.$d.years,YY:s.s(this.$d.years,2,"0"),YYYY:s.s(this.$d.years,4,"0"),M:this.$d.months,MM:s.s(this.$d.months,2,"0"),D:this.$d.days,DD:s.s(this.$d.days,2,"0"),H:this.$d.hours,HH:s.s(this.$d.hours,2,"0"),m:this.$d.minutes,mm:s.s(this.$d.minutes,2,"0"),s:this.$d.seconds,ss:s.s(this.$d.seconds,2,"0"),SSS:s.s(this.$d.milliseconds,3,"0")};return $.replace(W,function(b,p){return p||String(f[b])})},g.as=function(k){return this.$ms/x[N(k)]},g.get=function(k){var $=this.$ms,f=N(k);return f==="milliseconds"?$%=1e3:$=f==="weeks"?z($/x[f]):this.$d[f],$||0},g.add=function(k,$,f){var b;return b=$?k*x[N($)]:T(k)?k.$ms:R(k,this).$ms,R(this.$ms+b*(f?-1:1),this)},g.subtract=function(k,$){return this.add(k,$,!0)},g.locale=function(k){var $=this.clone();return $.$l=k,$},g.clone=function(){return R(this.$ms,this)},g.humanize=function(k){return i().add(this.$ms,"ms").locale(this.$l).fromNow(!k)},g.valueOf=function(){return this.asMilliseconds()},g.milliseconds=function(){return this.get("milliseconds")},g.asMilliseconds=function(){return this.as("milliseconds")},g.seconds=function(){return this.get("seconds")},g.asSeconds=function(){return this.as("seconds")},g.minutes=function(){return this.get("minutes")},g.asMinutes=function(){return this.as("minutes")},g.hours=function(){return this.get("hours")},g.asHours=function(){return this.as("hours")},g.days=function(){return this.get("days")},g.asDays=function(){return this.as("days")},g.weeks=function(){return this.get("weeks")},g.asWeeks=function(){return this.as("weeks")},g.months=function(){return this.get("months")},g.asMonths=function(){return this.as("months")},g.years=function(){return this.get("years")},g.asYears=function(){return this.as("years")},M}(),q=function(M,g,k){return M.add(g.years()*k,"y").add(g.months()*k,"M").add(g.days()*k,"d").add(g.hours()*k,"h").add(g.minutes()*k,"m").add(g.seconds()*k,"s").add(g.milliseconds()*k,"ms")};return function(M,g,k){i=k,s=k().$utils(),k.duration=function(b,p){var v=k.locale();return R(b,{$l:v},p)},k.isDuration=T;var $=g.prototype.add,f=g.prototype.subtract;g.prototype.add=function(b,p){return T(b)?q(this,b,1):$.bind(this)(b,p)},g.prototype.subtract=function(b,p){return T(b)?q(this,b,-1):f.bind(this)(b,p)}}})})(Ce);var Ci=Ce.exports;const Si=ye(Ci);var Nt=function(){var t=l(function(v,a,d,m){for(d=d||{},m=v.length;m--;d[v[m]]=a);return d},"o"),e=[6,8,10,12,13,14,15,16,17,18,20,21,22,23,24,25,26,27,28,29,30,31,33,35,36,38,40],i=[1,26],s=[1,27],r=[1,28],h=[1,29],y=[1,30],w=[1,31],L=[1,32],A=[1,33],F=[1,34],W=[1,9],x=[1,10],T=[1,11],R=[1,12],N=[1,13],I=[1,14],z=[1,15],K=[1,16],B=[1,19],G=[1,20],q=[1,21],M=[1,22],g=[1,23],k=[1,25],$=[1,35],f={trace:l(function(){},"trace"),yy:{},symbols_:{error:2,start:3,gantt:4,document:5,EOF:6,line:7,SPACE:8,statement:9,NL:10,weekday:11,weekday_monday:12,weekday_tuesday:13,weekday_wednesday:14,weekday_thursday:15,weekday_friday:16,weekday_saturday:17,weekday_sunday:18,weekend:19,weekend_friday:20,weekend_saturday:21,dateFormat:22,inclusiveEndDates:23,topAxis:24,axisFormat:25,tickInterval:26,excludes:27,includes:28,todayMarker:29,title:30,acc_title:31,acc_title_value:32,acc_descr:33,acc_descr_value:34,acc_descr_multiline_value:35,section:36,clickStatement:37,taskTxt:38,taskData:39,click:40,callbackname:41,callbackargs:42,href:43,clickStatementDebug:44,$accept:0,$end:1},terminals_:{2:"error",4:"gantt",6:"EOF",8:"SPACE",10:"NL",12:"weekday_monday",13:"weekday_tuesday",14:"weekday_wednesday",15:"weekday_thursday",16:"weekday_friday",17:"weekday_saturday",18:"weekday_sunday",20:"weekend_friday",21:"weekend_saturday",22:"dateFormat",23:"inclusiveEndDates",24:"topAxis",25:"axisFormat",26:"tickInterval",27:"excludes",28:"includes",29:"todayMarker",30:"title",31:"acc_title",32:"acc_title_value",33:"acc_descr",34:"acc_descr_value",35:"acc_descr_multiline_value",36:"section",38:"taskTxt",39:"taskData",40:"click",41:"callbackname",42:"callbackargs",43:"href"},productions_:[0,[3,3],[5,0],[5,2],[7,2],[7,1],[7,1],[7,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[19,1],[19,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,2],[9,2],[9,1],[9,1],[9,1],[9,2],[37,2],[37,3],[37,3],[37,4],[37,3],[37,4],[37,2],[44,2],[44,3],[44,3],[44,4],[44,3],[44,4],[44,2]],performAction:l(function(a,d,m,u,S,n,E){var c=n.length-1;switch(S){case 1:return n[c-1];case 2:this.$=[];break;case 3:n[c-1].push(n[c]),this.$=n[c-1];break;case 4:case 5:this.$=n[c];break;case 6:case 7:this.$=[];break;case 8:u.setWeekday("monday");break;case 9:u.setWeekday("tuesday");break;case 10:u.setWeekday("wednesday");break;case 11:u.setWeekday("thursday");break;case 12:u.setWeekday("friday");break;case 13:u.setWeekday("saturday");break;case 14:u.setWeekday("sunday");break;case 15:u.setWeekend("friday");break;case 16:u.setWeekend("saturday");break;case 17:u.setDateFormat(n[c].substr(11)),this.$=n[c].substr(11);break;case 18:u.enableInclusiveEndDates(),this.$=n[c].substr(18);break;case 19:u.TopAxis(),this.$=n[c].substr(8);break;case 20:u.setAxisFormat(n[c].substr(11)),this.$=n[c].substr(11);break;case 21:u.setTickInterval(n[c].substr(13)),this.$=n[c].substr(13);break;case 22:u.setExcludes(n[c].substr(9)),this.$=n[c].substr(9);break;case 23:u.setIncludes(n[c].substr(9)),this.$=n[c].substr(9);break;case 24:u.setTodayMarker(n[c].substr(12)),this.$=n[c].substr(12);break;case 27:u.setDiagramTitle(n[c].substr(6)),this.$=n[c].substr(6);break;case 28:this.$=n[c].trim(),u.setAccTitle(this.$);break;case 29:case 30:this.$=n[c].trim(),u.setAccDescription(this.$);break;case 31:u.addSection(n[c].substr(8)),this.$=n[c].substr(8);break;case 33:u.addTask(n[c-1],n[c]),this.$="task";break;case 34:this.$=n[c-1],u.setClickEvent(n[c-1],n[c],null);break;case 35:this.$=n[c-2],u.setClickEvent(n[c-2],n[c-1],n[c]);break;case 36:this.$=n[c-2],u.setClickEvent(n[c-2],n[c-1],null),u.setLink(n[c-2],n[c]);break;case 37:this.$=n[c-3],u.setClickEvent(n[c-3],n[c-2],n[c-1]),u.setLink(n[c-3],n[c]);break;case 38:this.$=n[c-2],u.setClickEvent(n[c-2],n[c],null),u.setLink(n[c-2],n[c-1]);break;case 39:this.$=n[c-3],u.setClickEvent(n[c-3],n[c-1],n[c]),u.setLink(n[c-3],n[c-2]);break;case 40:this.$=n[c-1],u.setLink(n[c-1],n[c]);break;case 41:case 47:this.$=n[c-1]+" "+n[c];break;case 42:case 43:case 45:this.$=n[c-2]+" "+n[c-1]+" "+n[c];break;case 44:case 46:this.$=n[c-3]+" "+n[c-2]+" "+n[c-1]+" "+n[c];break}},"anonymous"),table:[{3:1,4:[1,2]},{1:[3]},t(e,[2,2],{5:3}),{6:[1,4],7:5,8:[1,6],9:7,10:[1,8],11:17,12:i,13:s,14:r,15:h,16:y,17:w,18:L,19:18,20:A,21:F,22:W,23:x,24:T,25:R,26:N,27:I,28:z,29:K,30:B,31:G,33:q,35:M,36:g,37:24,38:k,40:$},t(e,[2,7],{1:[2,1]}),t(e,[2,3]),{9:36,11:17,12:i,13:s,14:r,15:h,16:y,17:w,18:L,19:18,20:A,21:F,22:W,23:x,24:T,25:R,26:N,27:I,28:z,29:K,30:B,31:G,33:q,35:M,36:g,37:24,38:k,40:$},t(e,[2,5]),t(e,[2,6]),t(e,[2,17]),t(e,[2,18]),t(e,[2,19]),t(e,[2,20]),t(e,[2,21]),t(e,[2,22]),t(e,[2,23]),t(e,[2,24]),t(e,[2,25]),t(e,[2,26]),t(e,[2,27]),{32:[1,37]},{34:[1,38]},t(e,[2,30]),t(e,[2,31]),t(e,[2,32]),{39:[1,39]},t(e,[2,8]),t(e,[2,9]),t(e,[2,10]),t(e,[2,11]),t(e,[2,12]),t(e,[2,13]),t(e,[2,14]),t(e,[2,15]),t(e,[2,16]),{41:[1,40],43:[1,41]},t(e,[2,4]),t(e,[2,28]),t(e,[2,29]),t(e,[2,33]),t(e,[2,34],{42:[1,42],43:[1,43]}),t(e,[2,40],{41:[1,44]}),t(e,[2,35],{43:[1,45]}),t(e,[2,36]),t(e,[2,38],{42:[1,46]}),t(e,[2,37]),t(e,[2,39])],defaultActions:{},parseError:l(function(a,d){if(d.recoverable)this.trace(a);else{var m=new Error(a);throw m.hash=d,m}},"parseError"),parse:l(function(a){var d=this,m=[0],u=[],S=[null],n=[],E=this.table,c="",H=0,o=0,_=2,D=1,O=n.slice.call(arguments,1),C=Object.create(this.lexer),V={yy:{}};for(var Y in this.yy)Object.prototype.hasOwnProperty.call(this.yy,Y)&&(V.yy[Y]=this.yy[Y]);C.setInput(a,V.yy),V.yy.lexer=C,V.yy.parser=this,typeof C.yylloc>"u"&&(C.yylloc={});var mt=C.yylloc;n.push(mt);var Ct=C.options&&C.options.ranges;typeof V.yy.parseError=="function"?this.parseError=V.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function Ye(U){m.length=m.length-2*U,S.length=S.length-U,n.length=n.length-U}l(Ye,"popStack");function Zt(){var U;return U=u.pop()||C.lex()||D,typeof U!="number"&&(U instanceof Array&&(u=U,U=u.pop()),U=d.symbols_[U]||U),U}l(Zt,"lex");for(var X,st,J,St,at={},yt,tt,Qt,gt;;){if(st=m[m.length-1],this.defaultActions[st]?J=this.defaultActions[st]:((X===null||typeof X>"u")&&(X=Zt()),J=E[st]&&E[st][X]),typeof J>"u"||!J.length||!J[0]){var Et="";gt=[];for(yt in E[st])this.terminals_[yt]&&yt>_&&gt.push("'"+this.terminals_[yt]+"'");C.showPosition?Et="Parse error on line "+(H+1)+`:
`+C.showPosition()+`
Expecting `+gt.join(", ")+", got '"+(this.terminals_[X]||X)+"'":Et="Parse error on line "+(H+1)+": Unexpected "+(X==D?"end of input":"'"+(this.terminals_[X]||X)+"'"),this.parseError(Et,{text:C.match,token:this.terminals_[X]||X,line:C.yylineno,loc:mt,expected:gt})}if(J[0]instanceof Array&&J.length>1)throw new Error("Parse Error: multiple actions possible at state: "+st+", token: "+X);switch(J[0]){case 1:m.push(X),S.push(C.yytext),n.push(C.yylloc),m.push(J[1]),X=null,o=C.yyleng,c=C.yytext,H=C.yylineno,mt=C.yylloc;break;case 2:if(tt=this.productions_[J[1]][1],at.$=S[S.length-tt],at._$={first_line:n[n.length-(tt||1)].first_line,last_line:n[n.length-1].last_line,first_column:n[n.length-(tt||1)].first_column,last_column:n[n.length-1].last_column},Ct&&(at._$.range=[n[n.length-(tt||1)].range[0],n[n.length-1].range[1]]),St=this.performAction.apply(at,[c,o,H,V.yy,J[1],S,n].concat(O)),typeof St<"u")return St;tt&&(m=m.slice(0,-1*tt*2),S=S.slice(0,-1*tt),n=n.slice(0,-1*tt)),m.push(this.productions_[J[1]][0]),S.push(at.$),n.push(at._$),Qt=E[m[m.length-2]][m[m.length-1]],m.push(Qt);break;case 3:return!0}}return!0},"parse")},b=function(){var v={EOF:1,parseError:l(function(d,m){if(this.yy.parser)this.yy.parser.parseError(d,m);else throw new Error(d)},"parseError"),setInput:l(function(a,d){return this.yy=d||this.yy||{},this._input=a,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},"setInput"),input:l(function(){var a=this._input[0];this.yytext+=a,this.yyleng++,this.offset++,this.match+=a,this.matched+=a;var d=a.match(/(?:\r\n?|\n).*/g);return d?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),a},"input"),unput:l(function(a){var d=a.length,m=a.split(/(?:\r\n?|\n)/g);this._input=a+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-d),this.offset-=d;var u=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),m.length-1&&(this.yylineno-=m.length-1);var S=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:m?(m.length===u.length?this.yylloc.first_column:0)+u[u.length-m.length].length-m[0].length:this.yylloc.first_column-d},this.options.ranges&&(this.yylloc.range=[S[0],S[0]+this.yyleng-d]),this.yyleng=this.yytext.length,this},"unput"),more:l(function(){return this._more=!0,this},"more"),reject:l(function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError("Lexical error on line "+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:"",token:null,line:this.yylineno});return this},"reject"),less:l(function(a){this.unput(this.match.slice(a))},"less"),pastInput:l(function(){var a=this.matched.substr(0,this.matched.length-this.match.length);return(a.length>20?"...":"")+a.substr(-20).replace(/\n/g,"")},"pastInput"),upcomingInput:l(function(){var a=this.match;return a.length<20&&(a+=this._input.substr(0,20-a.length)),(a.substr(0,20)+(a.length>20?"...":"")).replace(/\n/g,"")},"upcomingInput"),showPosition:l(function(){var a=this.pastInput(),d=new Array(a.length+1).join("-");return a+this.upcomingInput()+`
`+d+"^"},"showPosition"),test_match:l(function(a,d){var m,u,S;if(this.options.backtrack_lexer&&(S={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(S.yylloc.range=this.yylloc.range.slice(0))),u=a[0].match(/(?:\r\n?|\n).*/g),u&&(this.yylineno+=u.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:u?u[u.length-1].length-u[u.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+a[0].length},this.yytext+=a[0],this.match+=a[0],this.matches=a,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(a[0].length),this.matched+=a[0],m=this.performAction.call(this,this.yy,this,d,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),m)return m;if(this._backtrack){for(var n in S)this[n]=S[n];return!1}return!1},"test_match"),next:l(function(){if(this.done)return this.EOF;this._input||(this.done=!0);var a,d,m,u;this._more||(this.yytext="",this.match="");for(var S=this._currentRules(),n=0;n<S.length;n++)if(m=this._input.match(this.rules[S[n]]),m&&(!d||m[0].length>d[0].length)){if(d=m,u=n,this.options.backtrack_lexer){if(a=this.test_match(m,S[n]),a!==!1)return a;if(this._backtrack){d=!1;continue}else return!1}else if(!this.options.flex)break}return d?(a=this.test_match(d,S[u]),a!==!1?a:!1):this._input===""?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:"",token:null,line:this.yylineno})},"next"),lex:l(function(){var d=this.next();return d||this.lex()},"lex"),begin:l(function(d){this.conditionStack.push(d)},"begin"),popState:l(function(){var d=this.conditionStack.length-1;return d>0?this.conditionStack.pop():this.conditionStack[0]},"popState"),_currentRules:l(function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},"_currentRules"),topState:l(function(d){return d=this.conditionStack.length-1-Math.abs(d||0),d>=0?this.conditionStack[d]:"INITIAL"},"topState"),pushState:l(function(d){this.begin(d)},"pushState"),stateStackSize:l(function(){return this.conditionStack.length},"stateStackSize"),options:{"case-insensitive":!0},performAction:l(function(d,m,u,S){switch(u){case 0:return this.begin("open_directive"),"open_directive";case 1:return this.begin("acc_title"),31;case 2:return this.popState(),"acc_title_value";case 3:return this.begin("acc_descr"),33;case 4:return this.popState(),"acc_descr_value";case 5:this.begin("acc_descr_multiline");break;case 6:this.popState();break;case 7:return"acc_descr_multiline_value";case 8:break;case 9:break;case 10:break;case 11:return 10;case 12:break;case 13:break;case 14:this.begin("href");break;case 15:this.popState();break;case 16:return 43;case 17:this.begin("callbackname");break;case 18:this.popState();break;case 19:this.popState(),this.begin("callbackargs");break;case 20:return 41;case 21:this.popState();break;case 22:return 42;case 23:this.begin("click");break;case 24:this.popState();break;case 25:return 40;case 26:return 4;case 27:return 22;case 28:return 23;case 29:return 24;case 30:return 25;case 31:return 26;case 32:return 28;case 33:return 27;case 34:return 29;case 35:return 12;case 36:return 13;case 37:return 14;case 38:return 15;case 39:return 16;case 40:return 17;case 41:return 18;case 42:return 20;case 43:return 21;case 44:return"date";case 45:return 30;case 46:return"accDescription";case 47:return 36;case 48:return 38;case 49:return 39;case 50:return":";case 51:return 6;case 52:return"INVALID"}},"anonymous"),rules:[/^(?:%%\{)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:%%(?!\{)*[^\n]*)/i,/^(?:[^\}]%%*[^\n]*)/i,/^(?:%%*[^\n]*[\n]*)/i,/^(?:[\n]+)/i,/^(?:\s+)/i,/^(?:%[^\n]*)/i,/^(?:href[\s]+["])/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:call[\s]+)/i,/^(?:\([\s]*\))/i,/^(?:\()/i,/^(?:[^(]*)/i,/^(?:\))/i,/^(?:[^)]*)/i,/^(?:click[\s]+)/i,/^(?:[\s\n])/i,/^(?:[^\s\n]*)/i,/^(?:gantt\b)/i,/^(?:dateFormat\s[^#\n;]+)/i,/^(?:inclusiveEndDates\b)/i,/^(?:topAxis\b)/i,/^(?:axisFormat\s[^#\n;]+)/i,/^(?:tickInterval\s[^#\n;]+)/i,/^(?:includes\s[^#\n;]+)/i,/^(?:excludes\s[^#\n;]+)/i,/^(?:todayMarker\s[^\n;]+)/i,/^(?:weekday\s+monday\b)/i,/^(?:weekday\s+tuesday\b)/i,/^(?:weekday\s+wednesday\b)/i,/^(?:weekday\s+thursday\b)/i,/^(?:weekday\s+friday\b)/i,/^(?:weekday\s+saturday\b)/i,/^(?:weekday\s+sunday\b)/i,/^(?:weekend\s+friday\b)/i,/^(?:weekend\s+saturday\b)/i,/^(?:\d\d\d\d-\d\d-\d\d\b)/i,/^(?:title\s[^\n]+)/i,/^(?:accDescription\s[^#\n;]+)/i,/^(?:section\s[^\n]+)/i,/^(?:[^:\n]+)/i,/^(?::[^#\n;]+)/i,/^(?::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{acc_descr_multiline:{rules:[6,7],inclusive:!1},acc_descr:{rules:[4],inclusive:!1},acc_title:{rules:[2],inclusive:!1},callbackargs:{rules:[21,22],inclusive:!1},callbackname:{rules:[18,19,20],inclusive:!1},href:{rules:[15,16],inclusive:!1},click:{rules:[24,25],inclusive:!1},INITIAL:{rules:[0,1,3,5,8,9,10,11,12,13,14,17,23,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52],inclusive:!0}}};return v}();f.lexer=b;function p(){this.yy={}}return l(p,"Parser"),p.prototype=f,f.Parser=p,new p}();Nt.parser=Nt;var Ei=Nt;j.extend(Di);j.extend(oi);j.extend(ci);var ce={friday:5,saturday:6},Z="",zt="",Bt=void 0,Ht="",dt=[],ft=[],jt=new Map,qt=[],_t=[],ht="",Xt="",Se=["active","done","crit","milestone","vert"],Gt=[],ot="",kt=!1,Ut=!1,Kt="sunday",Dt="saturday",Vt=0,Ii=l(function(){qt=[],_t=[],ht="",Gt=[],Tt=0,Rt=void 0,xt=void 0,P=[],Z="",zt="",Xt="",Bt=void 0,Ht="",dt=[],ft=[],kt=!1,Ut=!1,Vt=0,jt=new Map,ot="",ri(),Kt="sunday",Dt="saturday"},"clear"),Mi=l(function(t){ot=t},"setDiagramId"),Ai=l(function(t){zt=t},"setAxisFormat"),Fi=l(function(){return zt},"getAxisFormat"),$i=l(function(t){Bt=t},"setTickInterval"),Li=l(function(){return Bt},"getTickInterval"),Oi=l(function(t){Ht=t},"setTodayMarker"),Yi=l(function(){return Ht},"getTodayMarker"),Wi=l(function(t){Z=t},"setDateFormat"),Ni=l(function(){kt=!0},"enableInclusiveEndDates"),Vi=l(function(){return kt},"endDatesAreInclusive"),Pi=l(function(){Ut=!0},"enableTopAxis"),Ri=l(function(){return Ut},"topAxisEnabled"),zi=l(function(t){Xt=t},"setDisplayMode"),Bi=l(function(){return Xt},"getDisplayMode"),Hi=l(function(){return Z},"getDateFormat"),Ee=l((t,e)=>{const i=e.toLowerCase().split(/[\s,]+/).filter(s=>s!=="");return[...new Set([...t,...i])]},"mergeTokens"),ji=l(function(t){dt=Ee(dt,t)},"setIncludes"),qi=l(function(){return dt},"getIncludes"),Xi=l(function(t){ft=Ee(ft,t)},"setExcludes"),Gi=l(function(){return ft},"getExcludes"),Ui=l(function(){return jt},"getLinks"),Ki=l(function(t){ht=t,qt.push(t)},"addSection"),Ji=l(function(){return qt},"getSections"),Zi=l(function(){let t=le();const e=10;let i=0;for(;!t&&i<e;)t=le(),i++;return _t=P,_t},"getTasks"),Ie=l(function(t,e,i,s){const r=t.format(e.trim()),h=t.format("YYYY-MM-DD");return s.includes(r)||s.includes(h)?!1:i.includes("weekends")&&(t.isoWeekday()===ce[Dt]||t.isoWeekday()===ce[Dt]+1)||i.includes(t.format("dddd").toLowerCase())?!0:i.includes(r)||i.includes(h)},"isInvalidDate"),Qi=l(function(t){Kt=t},"setWeekday"),ts=l(function(){return Kt},"getWeekday"),es=l(function(t){Dt=t},"setWeekend"),Me=l(function(t,e,i,s){if(!i.length||t.manualEndTime)return;let r;t.startTime instanceof Date?r=j(t.startTime):r=j(t.startTime,e,!0),r=r.add(1,"d");let h;t.endTime instanceof Date?h=j(t.endTime):h=j(t.endTime,e,!0);const[y,w]=is(r,h,e,i,s);t.endTime=y.toDate(),t.renderEndTime=w},"checkTaskDates"),is=l(function(t,e,i,s,r){let h=!1,y=null;const w=e.add(1e4,"d");for(;t<=e;){if(h||(y=e.toDate()),h=Ie(t,i,s,r),h&&(e=e.add(1,"d"),e>w))throw new Error("Failed to find a valid date that was not excluded by `excludes` after 10,000 iterations.");t=t.add(1,"d")}return[e,y]},"fixTaskDates"),Pt=l(function(t,e,i){if(i=i.trim(),l(w=>{const L=w.trim();return L==="x"||L==="X"},"isTimestampFormat")(e)&&/^\d+$/.test(i))return new Date(Number(i));const h=/^after\s+(?<ids>[\d\w- ]+)/.exec(i);if(h!==null){let w=null;for(const A of h.groups.ids.split(" ")){let F=rt(A);F!==void 0&&(!w||F.endTime>w.endTime)&&(w=F)}if(w)return w.endTime;const L=new Date;return L.setHours(0,0,0,0),L}let y=j(i,e.trim(),!0);if(y.isValid())return y.toDate();{nt.debug("Invalid date:"+i),nt.debug("With date format:"+e.trim());const w=new Date(i);if(w===void 0||isNaN(w.getTime())||w.getFullYear()<-1e4||w.getFullYear()>1e4)throw new Error("Invalid date:"+i);return w}},"getStartDate"),Ae=l(function(t){const e=/^(\d+(?:\.\d+)?)([Mdhmswy]|ms)$/.exec(t.trim());return e!==null?[Number.parseFloat(e[1]),e[2]]:[NaN,"ms"]},"parseDuration"),Fe=l(function(t,e,i,s=!1){i=i.trim();const h=/^until\s+(?<ids>[\d\w- ]+)/.exec(i);if(h!==null){let F=null;for(const x of h.groups.ids.split(" ")){let T=rt(x);T!==void 0&&(!F||T.startTime<F.startTime)&&(F=T)}if(F)return F.startTime;const W=new Date;return W.setHours(0,0,0,0),W}let y=j(i,e.trim(),!0);if(y.isValid())return s&&(y=y.add(1,"d")),y.toDate();let w=j(t);const[L,A]=Ae(i);if(!Number.isNaN(L)){const F=w.add(L,A);F.isValid()&&(w=F)}return w.toDate()},"getEndDate"),Tt=0,ut=l(function(t){return t===void 0?(Tt=Tt+1,"task"+Tt):t},"parseId"),ss=l(function(t,e){let i;e.substr(0,1)===":"?i=e.substr(1,e.length):i=e;const s=i.split(","),r={};Jt(s,r,Se);for(let y=0;y<s.length;y++)s[y]=s[y].trim();let h="";switch(s.length){case 1:r.id=ut(),r.startTime=t.endTime,h=s[0];break;case 2:r.id=ut(),r.startTime=Pt(void 0,Z,s[0]),h=s[1];break;case 3:r.id=ut(s[0]),r.startTime=Pt(void 0,Z,s[1]),h=s[2];break}return h&&(r.endTime=Fe(r.startTime,Z,h,kt),r.manualEndTime=j(h,"YYYY-MM-DD",!0).isValid(),Me(r,Z,ft,dt)),r},"compileData"),ns=l(function(t,e){let i;e.substr(0,1)===":"?i=e.substr(1,e.length):i=e;const s=i.split(","),r={};Jt(s,r,Se);for(let h=0;h<s.length;h++)s[h]=s[h].trim();switch(s.length){case 1:r.id=ut(),r.startTime={type:"prevTaskEnd",id:t},r.endTime={data:s[0]};break;case 2:r.id=ut(),r.startTime={type:"getStartDate",startData:s[0]},r.endTime={data:s[1]};break;case 3:r.id=ut(s[0]),r.startTime={type:"getStartDate",startData:s[1]},r.endTime={data:s[2]};break}return r},"parseData"),Rt,xt,P=[],$e={},rs=l(function(t,e){const i={section:ht,type:ht,processed:!1,manualEndTime:!1,renderEndTime:null,raw:{data:e},task:t,classes:[]},s=ns(xt,e);i.raw.startTime=s.startTime,i.raw.endTime=s.endTime,i.id=s.id,i.prevTaskId=xt,i.active=s.active,i.done=s.done,i.crit=s.crit,i.milestone=s.milestone,i.vert=s.vert,i.vert?i.order=-1:(i.order=Vt,Vt++);const r=P.push(i);xt=i.id,$e[i.id]=r-1},"addTask"),rt=l(function(t){const e=$e[t];return P[e]},"findTaskById"),as=l(function(t,e){const i={section:ht,type:ht,description:t,task:t,classes:[]},s=ss(Rt,e);i.startTime=s.startTime,i.endTime=s.endTime,i.id=s.id,i.active=s.active,i.done=s.done,i.crit=s.crit,i.milestone=s.milestone,i.vert=s.vert,Rt=i,_t.push(i)},"addTaskOrg"),le=l(function(){const t=l(function(i){const s=P[i];let r="";switch(P[i].raw.startTime.type){case"prevTaskEnd":{const h=rt(s.prevTaskId);s.startTime=h.endTime;break}case"getStartDate":r=Pt(void 0,Z,P[i].raw.startTime.startData),r&&(P[i].startTime=r);break}return P[i].startTime&&(P[i].endTime=Fe(P[i].startTime,Z,P[i].raw.endTime.data,kt),P[i].endTime&&(P[i].processed=!0,P[i].manualEndTime=j(P[i].raw.endTime.data,"YYYY-MM-DD",!0).isValid(),Me(P[i],Z,ft,dt))),P[i].processed},"compileTask");let e=!0;for(const[i,s]of P.entries())t(i),e=e&&s.processed;return e},"compileTasks"),os=l(function(t,e){let i=e;ct().securityLevel!=="loose"&&(i=ni(e)),t.split(",").forEach(function(s){rt(s)!==void 0&&(Oe(s,()=>{window.open(i,"_self")}),jt.set(s,i))}),Le(t,"clickable")},"setLink"),Le=l(function(t,e){t.split(",").forEach(function(i){let s=rt(i);s!==void 0&&s.classes.push(e)})},"setClass"),cs=l(function(t,e,i){if(ct().securityLevel!=="loose"||e===void 0)return;let s=[];if(typeof i=="string"){s=i.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);for(let h=0;h<s.length;h++){let y=s[h].trim();y.startsWith('"')&&y.endsWith('"')&&(y=y.substr(1,y.length-2)),s[h]=y}}s.length===0&&s.push(t),rt(t)!==void 0&&Oe(t,()=>{ai.runFunc(e,...s)})},"setClickFun"),Oe=l(function(t,e){Gt.push(function(){const i=ot?`${ot}-${t}`:t,s=document.querySelector(`[id="${i}"]`);s!==null&&s.addEventListener("click",function(){e()})},function(){const i=ot?`${ot}-${t}`:t,s=document.querySelector(`[id="${i}-text"]`);s!==null&&s.addEventListener("click",function(){e()})})},"pushFun"),ls=l(function(t,e,i){t.split(",").forEach(function(s){cs(s,e,i)}),Le(t,"clickable")},"setClickEvent"),us=l(function(t){Gt.forEach(function(e){e(t)})},"bindFunctions"),ds={getConfig:l(()=>ct().gantt,"getConfig"),clear:Ii,setDateFormat:Wi,getDateFormat:Hi,enableInclusiveEndDates:Ni,endDatesAreInclusive:Vi,enableTopAxis:Pi,topAxisEnabled:Ri,setAxisFormat:Ai,getAxisFormat:Fi,setTickInterval:$i,getTickInterval:Li,setTodayMarker:Oi,getTodayMarker:Yi,setAccTitle:He,getAccTitle:Be,setDiagramTitle:ze,getDiagramTitle:Re,setDiagramId:Mi,setDisplayMode:zi,getDisplayMode:Bi,setAccDescription:Pe,getAccDescription:Ve,addSection:Ki,getSections:Ji,getTasks:Zi,addTask:rs,findTaskById:rt,addTaskOrg:as,setIncludes:ji,getIncludes:qi,setExcludes:Xi,getExcludes:Gi,setClickEvent:ls,setLink:os,getLinks:Ui,bindFunctions:us,parseDuration:Ae,isInvalidDate:Ie,setWeekday:Qi,getWeekday:ts,setWeekend:es};function Jt(t,e,i){let s=!0;for(;s;)s=!1,i.forEach(function(r){const h="^\\s*"+r+"\\s*$",y=new RegExp(h);t[0].match(y)&&(e[r]=!0,t.shift(1),s=!0)})}l(Jt,"getTaskTags");j.extend(Si);var fs=l(function(){nt.debug("Something is calling, setConf, remove the call")},"setConf"),ue={monday:ii,tuesday:ei,wednesday:ti,thursday:Qe,friday:Ze,saturday:Je,sunday:Ke},hs=l((t,e)=>{let i=[...t].map(()=>-1/0),s=[...t].sort((h,y)=>h.startTime-y.startTime||h.order-y.order),r=0;for(const h of s)for(let y=0;y<i.length;y++)if(h.startTime>=i[y]){i[y]=h.endTime,h.order=y+e,y>r&&(r=y);break}return r},"getMaxIntersections"),et,Ot=1e4,ms=l(function(t,e,i,s){const r=ct().gantt;s.db.setDiagramId(e);const h=ct().securityLevel;let y;h==="sandbox"&&(y=pt("#i"+e));const w=h==="sandbox"?pt(y.nodes()[0].contentDocument.body):pt("body"),L=h==="sandbox"?y.nodes()[0].contentDocument:document,A=L.getElementById(e);et=A.parentElement.offsetWidth,et===void 0&&(et=1200),r.useWidth!==void 0&&(et=r.useWidth);const F=s.db.getTasks(),W=F.filter(f=>!f.vert);let x=[];for(const f of W)x.push(f.type);x=$(x);const T={};let R=2*r.topPadding;if(s.db.getDisplayMode()==="compact"||r.displayMode==="compact"){const f={};for(const p of W)f[p.section]===void 0?f[p.section]=[p]:f[p.section].push(p);let b=0;for(const p of Object.keys(f)){const v=hs(f[p],b)+1;b+=v,R+=v*(r.barHeight+r.barGap),T[p]=v}}else{R+=W.length*(r.barHeight+r.barGap);for(const f of x)T[f]=W.filter(b=>b.type===f).length}A.setAttribute("viewBox","0 0 "+et+" "+R);const N=w.select(`[id="${e}"]`),I=je().domain([qe(F,function(f){return f.startTime}),Xe(F,function(f){return f.endTime})]).rangeRound([0,et-r.leftPadding-r.rightPadding]);function z(f,b){const p=f.startTime,v=b.startTime;let a=0;return p>v?a=1:p<v&&(a=-1),a}l(z,"taskCompare"),F.sort(z),K(F,et,R),Ge(N,R,et,r.useMaxWidth),N.append("text").text(s.db.getDiagramTitle()).attr("x",et/2).attr("y",r.titleTopMargin).attr("class","titleText");function K(f,b,p){const v=r.barHeight,a=v+r.barGap,d=r.topPadding,m=r.leftPadding,u=Ue().domain([0,x.length]).range(["#00B9FA","#F95002"]).interpolate(ki);G(a,d,m,b,p,f,s.db.getExcludes(),s.db.getIncludes()),M(m,d,b,p),B(f,a,d,m,v,u,b),g(a,d),k(m,d,b,p)}l(K,"makeGantt");function B(f,b,p,v,a,d,m){f.sort((o,_)=>o.vert===_.vert?0:o.vert?1:-1);const u=f.filter(o=>!o.vert),n=[...new Set(u.map(o=>o.order))].map(o=>u.find(_=>_.order===o));N.append("g").selectAll("rect").data(n).enter().append("rect").attr("x",0).attr("y",function(o,_){return _=o.order,_*b+p-2}).attr("width",function(){return m-r.rightPadding/2}).attr("height",b).attr("class",function(o){for(const[_,D]of x.entries())if(o.type===D)return"section section"+_%r.numberSectionStyles;return"section section0"}).enter();const E=N.append("g").selectAll("rect").data(f).enter(),c=s.db.getLinks();if(E.append("rect").attr("id",function(o){return e+"-"+o.id}).attr("rx",3).attr("ry",3).attr("x",function(o){return o.milestone?I(o.startTime)+v+.5*(I(o.endTime)-I(o.startTime))-.5*a:I(o.startTime)+v}).attr("y",function(o,_){return _=o.order,o.vert?r.gridLineStartPadding:_*b+p}).attr("width",function(o){return o.milestone?a:o.vert?.08*a:I(o.renderEndTime||o.endTime)-I(o.startTime)}).attr("height",function(o){return o.vert?u.length*(r.barHeight+r.barGap)+r.barHeight*2:a}).attr("transform-origin",function(o,_){return _=o.order,(I(o.startTime)+v+.5*(I(o.endTime)-I(o.startTime))).toString()+"px "+(_*b+p+.5*a).toString()+"px"}).attr("class",function(o){const _="task";let D="";o.classes.length>0&&(D=o.classes.join(" "));let O=0;for(const[V,Y]of x.entries())o.type===Y&&(O=V%r.numberSectionStyles);let C="";return o.active?o.crit?C+=" activeCrit":C=" active":o.done?o.crit?C=" doneCrit":C=" done":o.crit&&(C+=" crit"),C.length===0&&(C=" task"),o.milestone&&(C=" milestone "+C),o.vert&&(C=" vert "+C),C+=O,C+=" "+D,_+C}),E.append("text").attr("id",function(o){return e+"-"+o.id+"-text"}).text(function(o){return o.task}).attr("font-size",r.fontSize).attr("x",function(o){let _=I(o.startTime),D=I(o.renderEndTime||o.endTime);if(o.milestone&&(_+=.5*(I(o.endTime)-I(o.startTime))-.5*a,D=_+a),o.vert)return I(o.startTime)+v;const O=this.getBBox().width;return O>D-_?D+O+1.5*r.leftPadding>m?_+v-5:D+v+5:(D-_)/2+_+v}).attr("y",function(o,_){return o.vert?r.gridLineStartPadding+u.length*(r.barHeight+r.barGap)+60:(_=o.order,_*b+r.barHeight/2+(r.fontSize/2-2)+p)}).attr("text-height",a).attr("class",function(o){const _=I(o.startTime);let D=I(o.endTime);o.milestone&&(D=_+a);const O=this.getBBox().width;let C="";o.classes.length>0&&(C=o.classes.join(" "));let V=0;for(const[mt,Ct]of x.entries())o.type===Ct&&(V=mt%r.numberSectionStyles);let Y="";return o.active&&(o.crit?Y="activeCritText"+V:Y="activeText"+V),o.done?o.crit?Y=Y+" doneCritText"+V:Y=Y+" doneText"+V:o.crit&&(Y=Y+" critText"+V),o.milestone&&(Y+=" milestoneText"),o.vert&&(Y+=" vertText"),O>D-_?D+O+1.5*r.leftPadding>m?C+" taskTextOutsideLeft taskTextOutside"+V+" "+Y:C+" taskTextOutsideRight taskTextOutside"+V+" "+Y+" width-"+O:C+" taskText taskText"+V+" "+Y+" width-"+O}),ct().securityLevel==="sandbox"){let o;o=pt("#i"+e);const _=o.nodes()[0].contentDocument;E.filter(function(D){return c.has(D.id)}).each(function(D){var O=_.querySelector("#"+CSS.escape(e+"-"+D.id)),C=_.querySelector("#"+CSS.escape(e+"-"+D.id+"-text"));const V=O.parentNode;var Y=_.createElement("a");Y.setAttribute("xlink:href",c.get(D.id)),Y.setAttribute("target","_top"),V.appendChild(Y),Y.appendChild(O),Y.appendChild(C)})}}l(B,"drawRects");function G(f,b,p,v,a,d,m,u){if(m.length===0&&u.length===0)return;let S,n;for(const{startTime:D,endTime:O}of d)(S===void 0||D<S)&&(S=D),(n===void 0||O>n)&&(n=O);if(!S||!n)return;if(j(n).diff(j(S),"year")>5){nt.warn("The difference between the min and max time is more than 5 years. This will cause performance issues. Skipping drawing exclude days.");return}const E=s.db.getDateFormat(),c=[];let H=null,o=j(S);for(;o.valueOf()<=n;)s.db.isInvalidDate(o,E,m,u)?H?H.end=o:H={start:o,end:o}:H&&(c.push(H),H=null),o=o.add(1,"d");N.append("g").selectAll("rect").data(c).enter().append("rect").attr("id",D=>e+"-exclude-"+D.start.format("YYYY-MM-DD")).attr("x",D=>I(D.start.startOf("day"))+p).attr("y",r.gridLineStartPadding).attr("width",D=>I(D.end.endOf("day"))-I(D.start.startOf("day"))).attr("height",a-b-r.gridLineStartPadding).attr("transform-origin",function(D,O){return(I(D.start)+p+.5*(I(D.end)-I(D.start))).toString()+"px "+(O*f+.5*a).toString()+"px"}).attr("class","exclude-range")}l(G,"drawExcludeDays");function q(f,b,p,v){if(p<=0||f>b)return 1/0;const a=b-f,d=j.duration({[v??"day"]:p}).asMilliseconds();return d<=0?1/0:Math.ceil(a/d)}l(q,"getEstimatedTickCount");function M(f,b,p,v){const a=s.db.getDateFormat(),d=s.db.getAxisFormat();let m;d?m=d:a==="D"?m="%d":m=r.axisFormat??"%Y-%m-%d";let u=wi(I).tickSize(-v+b+r.gridLineStartPadding).tickFormat(te(m));const n=/^([1-9]\d*)(millisecond|second|minute|hour|day|week|month)$/.exec(s.db.getTickInterval()||r.tickInterval);if(n!==null){const E=parseInt(n[1],10);if(isNaN(E)||E<=0)nt.warn(`Invalid tick interval value: "${n[1]}". Skipping custom tick interval.`);else{const c=n[2],H=s.db.getWeekday()||r.weekday,o=I.domain(),_=o[0],D=o[1],O=q(_,D,E,c);if(O>Ot)nt.warn(`The tick interval "${E}${c}" would generate ${O} ticks, which exceeds the maximum allowed (${Ot}). This may indicate an invalid date or time range. Skipping custom tick interval.`);else switch(c){case"millisecond":u.ticks(ae.every(E));break;case"second":u.ticks(re.every(E));break;case"minute":u.ticks(ne.every(E));break;case"hour":u.ticks(se.every(E));break;case"day":u.ticks(ie.every(E));break;case"week":u.ticks(ue[H].every(E));break;case"month":u.ticks(ee.every(E));break}}}if(N.append("g").attr("class","grid").attr("transform","translate("+f+", "+(v-50)+")").call(u).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10).attr("dy","1em"),s.db.topAxisEnabled()||r.topAxis){let E=xi(I).tickSize(-v+b+r.gridLineStartPadding).tickFormat(te(m));if(n!==null){const c=parseInt(n[1],10);if(isNaN(c)||c<=0)nt.warn(`Invalid tick interval value: "${n[1]}". Skipping custom tick interval.`);else{const H=n[2],o=s.db.getWeekday()||r.weekday,_=I.domain(),D=_[0],O=_[1];if(q(D,O,c,H)<=Ot)switch(H){case"millisecond":E.ticks(ae.every(c));break;case"second":E.ticks(re.every(c));break;case"minute":E.ticks(ne.every(c));break;case"hour":E.ticks(se.every(c));break;case"day":E.ticks(ie.every(c));break;case"week":E.ticks(ue[o].every(c));break;case"month":E.ticks(ee.every(c));break}}}N.append("g").attr("class","grid").attr("transform","translate("+f+", "+b+")").call(E).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10)}}l(M,"makeGrid");function g(f,b){let p=0;const v=Object.keys(T).map(a=>[a,T[a]]);N.append("g").selectAll("text").data(v).enter().append(function(a){const d=a[0].split(si.lineBreakRegex),m=-(d.length-1)/2,u=L.createElementNS("http://www.w3.org/2000/svg","text");u.setAttribute("dy",m+"em");for(const[S,n]of d.entries()){const E=L.createElementNS("http://www.w3.org/2000/svg","tspan");E.setAttribute("alignment-baseline","central"),E.setAttribute("x","10"),S>0&&E.setAttribute("dy","1em"),E.textContent=n,u.appendChild(E)}return u}).attr("x",10).attr("y",function(a,d){if(d>0)for(let m=0;m<d;m++)return p+=v[d-1][1],a[1]*f/2+p*f+b;else return a[1]*f/2+b}).attr("font-size",r.sectionFontSize).attr("class",function(a){for(const[d,m]of x.entries())if(a[0]===m)return"sectionTitle sectionTitle"+d%r.numberSectionStyles;return"sectionTitle"})}l(g,"vertLabels");function k(f,b,p,v){const a=s.db.getTodayMarker();if(a==="off")return;const d=N.append("g").attr("class","today"),m=new Date,u=d.append("line");u.attr("x1",I(m)+f).attr("x2",I(m)+f).attr("y1",r.titleTopMargin).attr("y2",v-r.titleTopMargin).attr("class","today"),a!==""&&u.attr("style",a.replace(/,/g,";"))}l(k,"drawToday");function $(f){const b={},p=[];for(let v=0,a=f.length;v<a;++v)Object.prototype.hasOwnProperty.call(b,f[v])||(b[f[v]]=!0,p.push(f[v]));return p}l($,"checkUnique")},"draw"),ks={setConf:fs,draw:ms},ys=l(t=>`
  .mermaid-main-font {
        font-family: ${t.fontFamily};
  }

  .exclude-range {
    fill: ${t.excludeBkgColor};
  }

  .section {
    stroke: none;
    opacity: 0.2;
  }

  .section0 {
    fill: ${t.sectionBkgColor};
  }

  .section2 {
    fill: ${t.sectionBkgColor2};
  }

  .section1,
  .section3 {
    fill: ${t.altSectionBkgColor};
    opacity: 0.2;
  }

  .sectionTitle0 {
    fill: ${t.titleColor};
  }

  .sectionTitle1 {
    fill: ${t.titleColor};
  }

  .sectionTitle2 {
    fill: ${t.titleColor};
  }

  .sectionTitle3 {
    fill: ${t.titleColor};
  }

  .sectionTitle {
    text-anchor: start;
    font-family: ${t.fontFamily};
  }


  /* Grid and axis */

  .grid .tick {
    stroke: ${t.gridColor};
    opacity: 0.8;
    shape-rendering: crispEdges;
  }

  .grid .tick text {
    font-family: ${t.fontFamily};
    fill: ${t.textColor};
  }

  .grid path {
    stroke-width: 0;
  }


  /* Today line */

  .today {
    fill: none;
    stroke: ${t.todayLineColor};
    stroke-width: 2px;
  }


  /* Task styling */

  /* Default task */

  .task {
    stroke-width: 2;
  }

  .taskText {
    text-anchor: middle;
    font-family: ${t.fontFamily};
  }

  .taskTextOutsideRight {
    fill: ${t.taskTextDarkColor};
    text-anchor: start;
    font-family: ${t.fontFamily};
  }

  .taskTextOutsideLeft {
    fill: ${t.taskTextDarkColor};
    text-anchor: end;
  }


  /* Special case clickable */

  .task.clickable {
    cursor: pointer;
  }

  .taskText.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideLeft.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideRight.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }


  /* Specific task settings for the sections*/

  .taskText0,
  .taskText1,
  .taskText2,
  .taskText3 {
    fill: ${t.taskTextColor};
  }

  .task0,
  .task1,
  .task2,
  .task3 {
    fill: ${t.taskBkgColor};
    stroke: ${t.taskBorderColor};
  }

  .taskTextOutside0,
  .taskTextOutside2
  {
    fill: ${t.taskTextOutsideColor};
  }

  .taskTextOutside1,
  .taskTextOutside3 {
    fill: ${t.taskTextOutsideColor};
  }


  /* Active task */

  .active0,
  .active1,
  .active2,
  .active3 {
    fill: ${t.activeTaskBkgColor};
    stroke: ${t.activeTaskBorderColor};
  }

  .activeText0,
  .activeText1,
  .activeText2,
  .activeText3 {
    fill: ${t.taskTextDarkColor} !important;
  }


  /* Completed task */

  .done0,
  .done1,
  .done2,
  .done3 {
    stroke: ${t.doneTaskBorderColor};
    fill: ${t.doneTaskBkgColor};
    stroke-width: 2;
  }

  .doneText0,
  .doneText1,
  .doneText2,
  .doneText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  /* Done task text displayed outside the bar sits against the diagram background,
     not against the done-task bar, so it must use the outside/contrast color. */
  .doneText0.taskTextOutsideLeft,
  .doneText0.taskTextOutsideRight,
  .doneText1.taskTextOutsideLeft,
  .doneText1.taskTextOutsideRight,
  .doneText2.taskTextOutsideLeft,
  .doneText2.taskTextOutsideRight,
  .doneText3.taskTextOutsideLeft,
  .doneText3.taskTextOutsideRight {
    fill: ${t.taskTextOutsideColor} !important;
  }


  /* Tasks on the critical line */

  .crit0,
  .crit1,
  .crit2,
  .crit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.critBkgColor};
    stroke-width: 2;
  }

  .activeCrit0,
  .activeCrit1,
  .activeCrit2,
  .activeCrit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.activeTaskBkgColor};
    stroke-width: 2;
  }

  .doneCrit0,
  .doneCrit1,
  .doneCrit2,
  .doneCrit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.doneTaskBkgColor};
    stroke-width: 2;
    cursor: pointer;
    shape-rendering: crispEdges;
  }

  .milestone {
    transform: rotate(45deg) scale(0.8,0.8);
  }

  .milestoneText {
    font-style: italic;
  }
  .doneCritText0,
  .doneCritText1,
  .doneCritText2,
  .doneCritText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  /* Done-crit task text outside the bar — same reasoning as doneText above. */
  .doneCritText0.taskTextOutsideLeft,
  .doneCritText0.taskTextOutsideRight,
  .doneCritText1.taskTextOutsideLeft,
  .doneCritText1.taskTextOutsideRight,
  .doneCritText2.taskTextOutsideLeft,
  .doneCritText2.taskTextOutsideRight,
  .doneCritText3.taskTextOutsideLeft,
  .doneCritText3.taskTextOutsideRight {
    fill: ${t.taskTextOutsideColor} !important;
  }

  .vert {
    stroke: ${t.vertLineColor};
  }

  .vertText {
    font-size: 15px;
    text-anchor: middle;
    fill: ${t.vertLineColor} !important;
  }

  .activeCritText0,
  .activeCritText1,
  .activeCritText2,
  .activeCritText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  .titleText {
    text-anchor: middle;
    font-size: 18px;
    fill: ${t.titleColor||t.textColor};
    font-family: ${t.fontFamily};
  }
`,"getStyles"),gs=ys,vs={parser:Ei,db:ds,renderer:ks,styles:gs};export{vs as diagram};
