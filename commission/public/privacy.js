fetch('/api/privacy',{credentials:'omit'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(p=>{
 document.querySelector('#operator').textContent=p.operator;
 document.querySelector('#hosting-name').textContent=p.hostingName||'Vercel';
 const contact=document.querySelector('#privacy-contact');contact.textContent=p.contact;contact.href='mailto:'+p.contact;
 document.querySelector('#policy-version').textContent=p.version;
 document.querySelector('#policy-effective').textContent=p.reviewed?'현재 적용 중인 안내입니다.':'실제 접수 개시 전 확정본을 게시합니다.';
 document.querySelector('#retention-days').textContent=p.retentionDays;
 document.querySelector('#policy-state').textContent=p.reviewed?'개인정보 처리 및 동의 안내':'접수 개시 전 검토본입니다. 외부 서비스의 처리 조건 확인이 끝나기 전까지 로그인과 접수를 받지 않습니다.';
 for(const t of p.transfers){const article=document.createElement('article');article.className='transfer-notice';const heading=document.createElement('h3');heading.textContent=t.recipient;article.append(heading);const dl=document.createElement('dl');dl.className='review';for(const [label,value] of [['국가',t.country],['목적',t.purpose],['항목',t.items],['이전 시점·방법',t.timing],['보관 기간',t.retention],['문의처',t.contact],['확인 상태',t.verified?'확인 완료':'실제 설정·계약 조건 확인 전']]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}const a=document.createElement('a');a.href=t.policyUrl;a.textContent='제공자 개인정보 안내 ↗';a.target='_blank';a.rel='noopener noreferrer';article.append(dl,a);document.querySelector('#transfer-notices').append(article);}
}).catch(()=>{document.querySelector('#policy-state').textContent='안내를 불러오지 못했습니다. 새로고침 후 다시 확인해주세요. 확인 전에는 신청하지 마세요.';});
