import { useEffect, useState } from "react";
import { API } from "../api";
import { Link } from "react-router-dom";
import { 
  Plus, 
  ListTodo, 
  MoreHorizontal, 
  Trash2, 
  Download,
  FileJson,
  FileSpreadsheet,
  Building2,
  MapPin,
  DollarSign,
  Search,
  FolderPlus
} from "lucide-react";

export default function Lists() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [selectedList, setSelectedList] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const sampleLists = [
    { 
      _id: "1", 
      name: "AI Investments", 
      companies: [
        { _id: "1", name: "NeuralFlow AI", website: "https://neuralflow.ai", industry: "AI/ML", location: "San Francisco", funding: "$25M Series A" },
        { _id: "6", name: "DataMinds", website: "https://dataminds.ai", industry: "AI/ML", location: "Boston", funding: "$30M Series A" }
      ]
    },
    { 
      _id: "2", 
      name: "Fintech Favorites", 
      companies: [
        { _id: "2", name: "PayStack Pro", website: "https://paystackpro.com", industry: "Fintech", location: "New York", funding: "$12M Series A" },
        { _id: "7", name: "SecurePay", website: "https://securepay.io", industry: "Fintech", location: "San Francisco", funding: "$18M Series A" }
      ]
    },
    { 
      _id: "3", 
      name: "Healthcare Watchlist", 
      companies: [
        { _id: "4", name: "MedTech Vision", website: "https://medtechvision.com", industry: "Healthcare", location: "Seattle", funding: "$45M Series B" },
        { _id: "8", name: "HealthSync", website: "https://healthsync.com", industry: "Healthcare", location: "New York", funding: "$22M Series A" }
      ]
    }
  ];

  useEffect(() => {
    API.get("/lists")
      .then((res) => {
        setLists(res.data || sampleLists);
      })
      .catch(() => {
        setLists(sampleLists);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      const res = await API.post("/lists", { name: newListName });
      setLists([...lists, res.data]);
      setNewListName("");
      setShowCreateModal(false);
    } catch (err) {
      // Demo mode - add locally
      const newList = {
        _id: Date.now().toString(),
        name: newListName,
        companies: []
      };
      setLists([...lists, newList]);
      setNewListName("");
      setShowCreateModal(false);
    }
  };

  const handleDeleteList = async (listId) => {
    if (!confirm("Are you sure you want to delete this list?")) return;
    try {
      await API.delete(`/lists/${listId}`);
      setLists(lists.filter(l => l._id !== listId));
    } catch (err) {
      setLists(lists.filter(l => l._id !== listId));
    }
  };

  const handleExport = (list, format) => {
    const data = list.companies || [];
    let content, filename, type;

    if (format === "json") {
      content = JSON.stringify(data, null, 2);
      filename = `${list.name.replace(/\s+/g, "-").toLowerCase()}.json`;
      type = "application/json";
    } else {
      // CSV
      const headers = ["Name", "Website", "Industry", "Location", "Funding"];
      const rows = data.map(c => [c.name, c.website, c.industry, c.location, c.funding]);
      content = [headers, ...rows].map(row => row.join(",")).join("\n");
      filename = `${list.name.replace(/\s+/g, "-").toLowerCase()}.csv`;
      type = "text/csv";
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredCompanies = selectedList 
    ? (selectedList.companies || []).filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-white border border-slate-200 rounded-xl p-4 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Lists</h1>
          <p className="text-sm text-slate-500 mt-1">Organize and track your favorite companies</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          Create List
        </button>
      </div>

      {/* Lists Grid */}
      <div className="grid grid-cols-3 gap-4">
        {lists.map((list) => (
          <div 
            key={list._id}
            className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
              selectedList?._id === list._id ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200"
            }`}
            onClick={() => setSelectedList(list)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <ListTodo className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{list.name}</h3>
                  <p className="text-xs text-slate-500">{list.companies?.length || 0} companies</p>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteList(list._id);
                }}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            {/* Preview companies */}
            <div className="space-y-2">
              {(list.companies || []).slice(0, 3).map((company, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500">
                    {company.name?.charAt(0)}
                  </div>
                  <span className="truncate">{company.name}</span>
                </div>
              ))}
              {(list.companies?.length || 0) > 3 && (
                <p className="text-xs text-slate-500 pl-8">+{list.companies.length - 3} more</p>
              )}
              {(list.companies?.length || 0) === 0 && (
                <p className="text-xs text-slate-400 italic pl-2">No companies yet</p>
              )}
            </div>

            {/* Export buttons */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport(list, "json");
                }}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <FileJson className="w-3 h-3" />
                JSON
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport(list, "csv");
                }}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <FileSpreadsheet className="w-3 h-3" />
                CSV
              </button>
            </div>
          </div>
        ))}

        {/* Empty state / Add new */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="border-2 border-dashed border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors flex flex-col items-center justify-center gap-3 min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <FolderPlus className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">Create a new list</p>
        </button>
      </div>

      {/* Selected List Detail */}
      {selectedList && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{selectedList.name}</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search in list..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Industry</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Funding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCompanies.map((company) => (
                <tr key={company._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link to={`/company/${company._id}`} className="flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold text-sm">
                        {company.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{company.name}</p>
                        <p className="text-xs text-slate-500">{company.website?.replace("https://", "")}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{company.industry}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {company.location}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    {company.funding}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCompanies.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-slate-500">No companies found</p>
            </div>
          )}
        </div>
      )}

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Create New List</h3>
            <input
              type="text"
              placeholder="List name..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateList}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
