/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.601Z */
/* JEV L7.4 脗路 FaceCollector 忙篓隆氓聺聴 芒聙聰 茅聡聡茅聸聠忙聹卢盲潞潞氓聼潞氓聡聠氓聸戮氓聝聫 */ 
(async () => { 
  console.log("冒聼聯赂 [FaceCollector] 氓录聙氓搂聥茅聡聡茅聸聠盲潞潞猫聞赂..."); 

  const video = document.createElement("video"); 
  document.body.appendChild(video); 
  video.style.width = "320px"; 
  video.style.border = "2px solid #0f0"; 

  try { 
    const stream = await navigator.mediaDevices.getUserMedia({ video: true }); 
    video.srcObject = stream; 
    await video.play(); 

    console.log("冒聼聵聨 猫炉路茅聺垄氓炉鹿忙聭聞氓聝聫氓陇麓茂录聦盲驴聺忙聦聛3莽搂聮盲赂聧氓聤篓..."); 
    await new Promise((r) => setTimeout(r, 3000)); 

    // 忙聤聯氓聫聳氓赂搂 
    const canvas = document.createElement("canvas"); 
    canvas.width = 320; canvas.height = 240; 
    const ctx = canvas.getContext("2d"); 
    ctx.drawImage(video, 0, 0, 320, 240); 
    const imageData = canvas.toDataURL("image/png"); 

    // 莽禄聯忙聺聼猫搂聠茅垄聭忙碌聛 
    stream.getTracks().forEach((t) => t.stop()); 
    document.body.removeChild(video); 

    // 淇濆瓨氓聢掳忙聹卢氓聹掳茅聟聧莽陆庐 
    const payload = { 
      owner_id: "benson-jev-001", 
      timestamp: new Date().toISOString(), 
      face_signature: imageData 
    }; 

    localStorage.setItem("JEV_FACE_TEMPLATE", JSON.stringify(payload)); 
    console.log("芒聹聟 [FaceCollector] 盲潞潞猫聞赂忙篓隆忙聺驴茅聡聡茅聸聠氓庐聦忙聢聬茫聙聜氓路虏淇濆瓨氓聢掳 localStorage茫聙聜"); 
  } catch (err) { 
    console.error("冒聼職芦 [FaceCollector] 忙聭聞氓聝聫氓陇麓猫庐驴茅聴庐氓陇卤猫麓楼:", err); 
  } 
})();