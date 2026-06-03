(function () {
  const domainMaterialsUrl = 'https://drive.google.com/drive/folders/1iSgmiRUIoGPMVP_WGGnGSYnE0x50QrIY?usp=sharing';
  const sharedMaterials = [
    {
      title: 'Domain Materials',
      type: 'Drive Folder',
      fileUrl: domainMaterialsUrl,
    },
  ];

  const domains = [
    {
      id: 'D01',
      name: 'Business Analytics',
      materials: sharedMaterials,
    },
    {
      id: 'D02',
      name: 'Frontend Development',
      materials: sharedMaterials,
    },
    {
      id: 'D03',
      name: 'Backend Engineering',
      materials: sharedMaterials,
    },
    {
      id: 'D04',
      name: 'UI/UX Design',
      materials: sharedMaterials,
    },
  ];

  const students = [
    { internId: 'M-26IP001', name: 'Shyam', domainId: 'D01', credits: 0 },
    { internId: 'M-26IP002', name: 'Priya', domainId: 'D02', credits: 0 },
    { internId: 'M-26IP003', name: 'Arun', domainId: 'D03', credits: 0 },
    { internId: 'M-26IP004', name: 'Divya', domainId: 'D04', credits: 0 },
  ];

  window.dashboardData = {
    domains: domains,
    students: students,
  };
})();
