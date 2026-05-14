(function () {
  const domains = [
    {
      id: 'D01',
      name: 'Business Analytics',
      materials: [
        { title: 'Module 1 Notes', type: 'pdf', fileUrl: '#' },
        { title: 'Module 2 Case Study Notes', type: 'pdf', fileUrl: '#' },
        { title: 'Module 3 Reporting Guide', type: 'pdf', fileUrl: '#' },
      ],
    },
    {
      id: 'D02',
      name: 'Frontend Development',
      materials: [
        { title: 'Module 1 HTML Notes', type: 'pdf', fileUrl: '#' },
        { title: 'Module 2 CSS Notes', type: 'pdf', fileUrl: '#' },
        { title: 'Module 3 JavaScript Notes', type: 'pdf', fileUrl: '#' },
      ],
    },
    {
      id: 'D03',
      name: 'Backend Engineering',
      materials: [
        { title: 'Module 1 API Design Notes', type: 'pdf', fileUrl: '#' },
        { title: 'Module 2 Database Notes', type: 'pdf', fileUrl: '#' },
        { title: 'Module 3 Authentication Notes', type: 'pdf', fileUrl: '#' },
      ],
    },
    {
      id: 'D04',
      name: 'UI/UX Design',
      materials: [
        { title: 'Module 1 UX Principles', type: 'pdf', fileUrl: '#' },
        { title: 'Module 2 Wireframe Notes', type: 'pdf', fileUrl: '#' },
        { title: 'Module 3 Design System Notes', type: 'pdf', fileUrl: '#' },
      ],
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
