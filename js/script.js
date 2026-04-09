    const API_URL = "https://script.google.com/macros/s/AKfycbzgK6cqOvfQBVNS_z88IdJSwP4grzWKAyodAWrBpVeCs9C5vX71nBX0p4oTgX80GnY/exec";
    let masterData = JSON.parse(localStorage.getItem("masterData")) || [];
    let transactionData = JSON.parse(localStorage.getItem("transactionData")) || [];

    async function loadDataFromAPI() {
      try {
        const masterRes = await fetch(API_URL + "?type=getMaster");
        const masterJson = await masterRes.json();

        const transRes = await fetch(API_URL + "?type=getTransaction");
        const transJson = await transRes.json();

        // skip header
        masterData = masterJson.slice(1).map(r => ({
          code: r[0],
          name: r[1],
          category: r[2],
          min: r[3],
          edit:false
        }));

        transactionData = transJson.slice(1).map(r => ({
          code: r[0],
          name: r[1],
          type: r[2],
          qty: r[3],
          date: r[4],
          edit:false
        }));

        renderAll();

      } catch (err) {
        console.error("ERROR:", err);
      }
    }
    function saveData(){
    localStorage.setItem("masterData", JSON.stringify(masterData));
    localStorage.setItem("transactionData", JSON.stringify(transactionData));
    }
    function prepareStockData(){
    const stock = getStock();

    let data = [];

    Object.keys(stock).forEach(code=>{
    data.push({
    Code: code,
    Name: stock[code].name,
    Category: stock[code].category,
    Stock: stock[code].qty
    });
    });

    return data;
    }
    function exportToExcel(){
    const data = prepareStockData();

    let html = `
    <table border="1">
    <tr>
    <th>Code</th>
    <th>Name</th>
    <th>Category</th>
    <th>Stock</th>
    </tr>
    `;

    data.forEach(d=>{
    html += `
    <tr>
    <td>${d.Code}</td>
    <td>${d.Name}</td>
    <td>${d.Category}</td>
    <td>${d.Stock}</td>
    </tr>
    `;
    });

    html += `</table>`;

    let blob = new Blob([html], {type: "application/vnd.ms-excel"});
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "stock_inventory.xls";
    a.click();
    }
    function exportToCSV(){
    const data = prepareStockData();

    let csv = "Code,Name,Category,Stock\n";

    data.forEach(d=>{
    csv += `${d.Code},${d.Name},${d.Category},${d.Stock}\n`;
    });

    let blob = new Blob([csv], {type: "text/csv"});
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "stock_inventory.csv";
    a.click();
    }

    /* MASTER */
    function addMaster(){
    const name = document.getElementById("name").value;
    const category = document.getElementById("category").value;
    const min = document.getElementById("min").value;

    if(!name || !min) return alert("Isi dulu");

    let prefix = "";

  if(category === "Pantry") prefix = "PAN";
  if(category === "Kitchen") prefix = "KIT";
  if(category === "Amenities") prefix = "AME";

  // ambil nomor terakhir berdasarkan prefix
  const lastCodes = masterData
    .filter(m => m.code.startsWith(prefix))
    .map(m => parseInt(m.code.replace(prefix,"")) || 0);

  const newNumber = lastCodes.length > 0 ? Math.max(...lastCodes) + 1 : 1;

  const code = prefix + newNumber.toString().padStart(3,"0");

    /* SIMPAN KE GOOGLE SHEETS */
    fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
    type: "master",
    code,
    name,
    category,
    min
    })
    });

    /* SIMPAN KE LOCAL (BIAR UI LANGSUNG UPDATE) */
    masterData.push({code,name,category,min,edit:false});
    saveData();
    renderMaster();
    }
    function renderMaster(){
  const table = document.getElementById("masterTable");
  table.innerHTML="";

  // 🔥 SORT CATEGORY + CODE
  const sortedData = [...masterData].sort((a,b)=>{
    if(a.category === b.category){
      return a.code.localeCompare(b.code);
    }
    return a.category.localeCompare(b.category);
  });

  let currentCategory = "";

  sortedData.forEach((m)=>{
    const i = masterData.findIndex(x => x.code === m.code);

    // 🔥 HEADER CATEGORY
    if(m.category !== currentCategory){
      currentCategory = m.category;

      table.innerHTML += `
      <tr style="background:#0f172a;">
        <td colspan="5"><b>${currentCategory}</b></td>
      </tr>
      `;
    }

    if(m.edit){
      table.innerHTML += `
      <tr>
      <td>${m.code}</td>
      <td><input class="edit-input" value="${m.name}" id="n${i}"></td>
      <td>
      <select class="edit-input" id="c${i}">
      <option ${m.category=="Pantry"?"selected":""}>Pantry</option>
      <option ${m.category=="Kitchen"?"selected":""}>Kitchen</option>
      <option ${m.category=="Amenities"?"selected":""}>Amenities</option>
      </select>
      </td>
      <td><input class="edit-input" value="${m.min}" id="m${i}"></td>
      <td>
      <button class="btn save" onclick="saveMaster(${i})">Save</button>
      <button class="btn cancel" onclick="cancelMaster(${i})">Cancel</button>
      </td>
      </tr>`;
    }else{
      table.innerHTML += `
      <tr>
      <td>${m.code}</td>
      <td>${m.name}</td>
      <td>${m.category}</td>
      <td>${m.min}</td>
      <td>
      <button class="btn edit" onclick="editMaster(${i})">Edit</button>
      <button class="btn delete" onclick="deleteMaster(${i})">Delete</button>
      </td>
      </tr>`;
    }
  });

  document.getElementById("totalMaster").innerText = masterData.length;
  updateSelect();
}
    function editMaster(i){masterData[i].edit=true; renderMaster();}
    function cancelMaster(i){masterData[i].edit=false; renderMaster();}

    function saveMaster(i){
    const item = masterData[i];

    const name = document.getElementById("n"+i).value;
    const category = document.getElementById("c"+i).value;
    const min = document.getElementById("m"+i).value;

    fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        type: "editMaster",
        code: item.code,
        name,
        category,
        min
      })
    })
    .then(res => res.text())
    .then(res => {
      // update local setelah backend sukses
      masterData[i].name = name;
      masterData[i].category = category;
      masterData[i].min = min;
      masterData[i].edit = false;

      saveData();
      renderMaster();
      loadDataFromAPI();
    })
    .catch(err => {
      console.error(err);
      alert("Gagal update!");
    });
  }
    function deleteMaster(i){
    const item = masterData[i];

    fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        type: "deleteMaster",
        code: item.code
      })
    })
    .then(res => res.text())
    .then(res => {
      console.log("Deleted:", res);

      masterData.splice(i,1);
      saveData();
      renderMaster();
      loadDataFromAPI();
    })
    .catch(err => {
      console.error("Delete gagal:", err);
      alert("Gagal hapus data!");
    });
  }
    /* TRANSACTION */
    function addTransaction(){
    const item = document.getElementById("itemSelect").value.split("|");
    const type = document.getElementById("type").value;
    const qty = document.getElementById("qty").value;

    if(!qty) return alert("Isi qty");

    /* KIRIM KE GOOGLE SHEETS */
    fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
    type: "transaction",
    code:item[0],
    name:item[1],
    typeTrx:type,
    qty
    })
    });

    /* SIMPAN KE LOCAL */
    transactionData.push({
    code:item[0],
    name:item[1],
    type,
    qty,
    date:new Date().toISOString(),
    edit:false
    });

    saveData();
    renderTrans();
    }
  function formatDate(date){
    return new Date(date).toLocaleString("id-ID");
  }
    function renderTrans(){
    const table = document.getElementById("transTable");
    table.innerHTML="";

    transactionData.forEach((t,i)=>{
    if(t.edit){
    table.innerHTML += `
    <tr>
    <td>${t.code}</td>
    <td>${t.name}</td>
    <td>
    <select class="edit-input" id="t${i}">
    <option ${t.type=="IN"?"selected":""}>IN</option>
    <option ${t.type=="OUT"?"selected":""}>OUT</option>
    </select>
    </td>
    <td><input class="edit-input" value="${t.qty}" id="q${i}"></td>
    <td>${formatDate(t.date)}</td>
    <td>
    <button class="btn save" onclick="saveTrans(${i})">Save</button>
    <button class="btn cancel" onclick="cancelTrans(${i})">Cancel</button>
    </td>
    </tr>`;
    }else{
    table.innerHTML += `
    <tr>
    <td>${t.code}</td>
    <td>${t.name}</td>
    <td>${t.type}</td>
    <td>${t.qty}</td>
    <td>${formatDate(t.date)}</td>
    <td>
    <button class="btn edit" onclick="editTrans(${i})">Edit</button>
    <button class="btn delete" onclick="deleteTrans(${i})">Delete</button>
    </td>
    </tr>`;
    }
    });

    document.getElementById("totalTrans").innerText = transactionData.length;
    }

    function editTrans(i){transactionData[i].edit=true; renderTrans();}
    function cancelTrans(i){transactionData[i].edit=false; renderTrans();}

    function saveTrans(i){
    const type = document.getElementById("t"+i).value;
    const qty = document.getElementById("q"+i).value;

    const rowIndex = i + 2; // penting!

    fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        type: "editTransaction",
        row: rowIndex,
        typeTrx: type,
        qty: qty
      })
    })
    .then(res => res.text())
    .then(res => {
      transactionData[i].type = type;
      transactionData[i].qty = qty;
      transactionData[i].edit = false;

      saveData();
      renderTrans();
      loadDataFromAPI();
    })
    .catch(err => {
      console.error(err);
      alert("Gagal update!");
    });
  }

    

    function deleteTrans(i){
    const rowIndex = i + 2; // +2 karena header + index 0

    fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        type: "deleteTransaction",
        row: rowIndex
      })
    })
    .then(res => res.text())
    .then(res => {
      transactionData.splice(i,1);
      saveData();
      renderTrans();
      loadDataFromAPI();
    })
    .catch(err => {
      console.error(err);
      alert("Gagal delete!");
    });
  }

    /* STOCK */
    /* STOCK */
    function getStock(){
    let stock={};

    masterData.forEach(m=>{
    stock[m.code]={
    name:m.name,
    category:m.category, // 🔥 TAMBAH INI
    qty:0
    };
    });

    transactionData.forEach(t=>{
    if(!stock[t.code]) return;
    if(t.type=="IN") stock[t.code].qty+=Number(t.qty);
    else stock[t.code].qty-=Number(t.qty);
    });

    return stock;
    }

    function renderStockTable(){
    const table=document.getElementById("stockTable");
    table.innerHTML="";

    const stock=getStock();

    /* 🔥 UBAH JADI ARRAY + SORT */
    let stockArray = Object.keys(stock).map(code => ({
    code,
    name: stock[code].name,
    category: stock[code].category,
    qty: stock[code].qty
    }));

    /* 🔥 SORT BY CATEGORY */
    stockArray.sort((a,b)=> a.category.localeCompare(b.category));

    let currentCategory = "";

    /* 🔥 LOOP */
    stockArray.forEach(item=>{

    /* 🔥 GROUP HEADER */
    if(item.category !== currentCategory){
    currentCategory = item.category;

    table.innerHTML += `
    <tr style="background:#0f172a;">
    <td colspan="3"><b>${currentCategory}</b></td>
    </tr>
    `;
    }

    /* DATA */
    table.innerHTML+=`
    <tr>
    <td>${item.code}</td>
    <td>${item.name}</td>
    <td>${item.qty}</td>
    </tr>
    `;
    });

    }
    /* CHART */
    let chart;
    function getFilteredData() {
      
  const category = document.getElementById("categoryFilter")?.value || "all";
  const month = document.getElementById("monthFilter")?.value || "all";
  const start = window.startDate;
  const end = window.endDate;

  return transactionData.filter(item => {
    const date = new Date(item.date);
    //FILTER CATEGORY
    if (category !== "all") {
      const master = masterData.find(m => m.code === item.code);
      if (!master || master.category !== category) return false;
    }
    // FILTER BULAN
    const itemMonth = date.getMonth() + 1;
    if (month !== "all" && itemMonth != month) return false;

    // FILTER TANGGAL
    if (start && start > date) return false;
    if (end && end < date) return false;
    

    return true;
  });
}
    function renderChart(){
  const category = document.getElementById("categoryFilter")?.value || "all";
  const filtered = getFilteredData();

  const summary = {};

  filtered.forEach(item => {
    if (!summary[item.code]) {
      summary[item.code] = {
        name: item.name,
        category: masterData.find(m => m.code === item.code)?.category || "",
        qty: 0
      };
    }

    if (item.type === "IN") {
      summary[item.code].qty += Number(item.qty);
    } else {
      summary[item.code].qty -= Number(item.qty);
    }
  });

  const labels = [];
  const data = [];

  Object.values(summary).forEach(item => {
    if (category !== "all" && item.category !== category) return;
    if (item.qty <= 0) return;

    labels.push(item.name);
    data.push(item.qty);
  });
    
    if(labels.length === 0){
      labels.push("No Data");
      data.push(0);
    }
  const ctx = document.getElementById("chart");

  if(chart) chart.destroy();

  chart = new Chart(ctx,{
    type:'bar',
    data:{
      labels:labels,
      datasets:[{
        label:'Stock',
        data:data,
        backgroundColor:[
          "#60a5fa",
          "#34d399",
          "#fbbf24"
        ]
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      layout:{ padding:20 },
      plugins:{
        legend:{
          position:'top',
          labels:{ color:"#cbd5f5" }
        }
      },
      scales:{
        x:{
          ticks:{ color:"#94a3b8" },
          grid:{ display:false }
        },
        y:{
          ticks:{ color:"#94a3b8" }
        }
      }
    }
  });
}
    
        /* SELECT */
    function updateSelect(){
  const select = document.getElementById("itemSelect");
  select.innerHTML = "";

  const order = {
    "Pantry": 1,
    "Kitchen": 2,
    "Amenities": 3
  };

  // 🔥 SORT SAMA SEPERTI MASTER
  const sortedData = [...masterData].sort((a,b)=>{
    if(a.category === b.category){
      return a.code.localeCompare(b.code);
    }
    return order[a.category] - order[b.category];
  });

  let currentCategory = "";

  sortedData.forEach(m=>{
    if(m.category !== currentCategory){
      currentCategory = m.category;

      const optGroup = document.createElement("optgroup");
      optGroup.label = currentCategory;
      select.appendChild(optGroup);
    }

    const option = document.createElement("option");
    option.value = `${m.code}|${m.name}`;
    option.textContent = `${m.code} | ${m.name}`;

    select.lastChild.appendChild(option);
  });
}
    function updateClock(){
    const now = new Date();

    document.getElementById("currentDate").innerText =
      now.toLocaleDateString("id-ID", { weekday:'long', day:'2-digit', month:'long', year:'numeric' });

    document.getElementById("currentTime").innerText =
      now.toLocaleTimeString("id-ID");
  }

  setInterval(updateClock,1000);
  updateClock();

    /* RENDER ALL */
    function renderAll(){
    renderMaster();
    renderTrans();
    renderStockTable();
    renderChart();
    }
function showPage(page, el){
  document.getElementById("dashboardPage").style.display="none";
  document.getElementById("masterPage").style.display="none";
  document.getElementById("transactionPage").style.display="none";

  document.getElementById(page+"Page").style.display="block";

  document.querySelectorAll(".sidebar button").forEach(btn=>{
    btn.classList.remove("active");
  });

  if(el) el.classList.add("active"); // 🔥 aman tanpa error

  renderAll();
}   

  lucide.createIcons();
 window.onload = async function(){
  document.getElementById("monthFilter").value = new Date().getMonth() + 1;
  window.startDate = new Date();
  window.endDate = new Date();
  showPage('dashboard');
  await loadDataFromAPI();
}
flatpickr("#dateRange", {
  mode: "range",
  dateFormat: "Y-m-d",
  defaultDate: [new Date(), new Date()],
  onChange: function(selectedDates) {
    if (selectedDates.length === 2) {
      window.startDate = selectedDates[0];
      window.endDate = selectedDates[1];
      renderAll();
    }
  }
});