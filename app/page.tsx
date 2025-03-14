import React, { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';

const UrgentImportantMatrix = () => {
  const [tasks, setTasks] = useState([]);
  const [unassignedTasks, setUnassignedTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedFromUnassigned, setDraggedFromUnassigned] = useState(false);
  const [matrixUrl, setMatrixUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  
  // Load tasks from URL params on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const taskParam = urlParams.get('tasks');
    const unassignedParam = urlParams.get('unassigned');
    
    if (taskParam) {
      try {
        const decodedTasks = JSON.parse(decodeURIComponent(taskParam));
        setTasks(decodedTasks);
      } catch (e) {
        console.error("Failed to parse tasks from URL", e);
      }
    }
    
    if (unassignedParam) {
      try {
        const decodedUnassigned = JSON.parse(decodeURIComponent(unassignedParam));
        setUnassignedTasks(decodedUnassigned);
      } catch (e) {
        console.error("Failed to parse unassigned tasks from URL", e);
      }
    }
  }, []);
  
  // Update URL whenever tasks change
  useEffect(() => {
    let newUrl = `${window.location.origin}${window.location.pathname}`;
    const params = new URLSearchParams();
    
    if (tasks.length > 0) {
      params.set('tasks', encodeURIComponent(JSON.stringify(tasks)));
    }
    
    if (unassignedTasks.length > 0) {
      params.set('unassigned', encodeURIComponent(JSON.stringify(unassignedTasks)));
    }
    
    if (params.toString()) {
      newUrl += `?${params.toString()}`;
    }
    
    setMatrixUrl(newUrl);
    window.history.pushState({}, '', newUrl);
  }, [tasks, unassignedTasks]);
  
  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      const newTask = {
        id: Date.now().toString(),
        title: newTaskTitle,
        completed: false
      };
      
      setUnassignedTasks([...unassignedTasks, newTask]);
      setNewTaskTitle('');
    }
  };
  
  const handleDeleteTask = (id, isUnassigned = false) => {
    if (isUnassigned) {
      setUnassignedTasks(unassignedTasks.filter(task => task.id !== id));
    } else {
      setTasks(tasks.filter(task => task.id !== id));
    }
  };
  
  const handleDragStart = (task, isUnassigned = false) => {
    setDraggedTask(task);
    setDraggedFromUnassigned(isUnassigned);
  };
  
  const handleMatrixDrag = (e) => {
    if (draggedTask) {
      const matrixRect = e.currentTarget.getBoundingClientRect();
      
      // Calculate position on -5 to 5 scale for both axes
      // Important (x-axis) and Urgent (y-axis)
      const rawX = (e.clientX - matrixRect.left) / matrixRect.width;
      const rawY = (e.clientY - matrixRect.top) / matrixRect.height;
      
      // Convert to -5 to 5 scale (reversed for y-axis to make top = 5)
      const important = Math.round((rawX * 10) - 5);
      const urgent = Math.round(((1 - rawY) * 10) - 5);
      
      // Calculate percentage positions for centering in the appropriate position
      const x = ((important + 5) / 10) * 100;
      const y = ((5 - urgent) / 10) * 100;
      
      if (draggedFromUnassigned) {
        // Add to matrix tasks and remove from unassigned
        const newTask = { ...draggedTask, important, urgent, x, y };
        setTasks([...tasks, newTask]);
        setUnassignedTasks(unassignedTasks.filter(t => t.id !== draggedTask.id));
        setDraggedFromUnassigned(false);
      } else {
        // Update existing matrix task
        setTasks(tasks.map(task => 
          task.id === draggedTask.id 
            ? { ...task, important, urgent, x, y } 
            : task
        ));
      }
    }
  };
  
  const handleDragEnd = () => {
    setDraggedTask(null);
  };
  
  const handleRemoveFromMatrix = (taskId) => {
    // Find the task in the matrix
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      // Remove it from the matrix
      setTasks(tasks.filter(t => t.id !== taskId));
      // Add to unassigned without position data
      const { important, urgent, x, y, ...taskWithoutPosition } = task;
      setUnassignedTasks([...unassignedTasks, taskWithoutPosition]);
    }
  };
  
  // Toggle completed status on double-click
  const toggleTaskCompletion = (id, isUnassigned = false) => {
    if (isUnassigned) {
      setUnassignedTasks(unassignedTasks.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
      ));
    } else {
      setTasks(tasks.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
      ));
    }
  };
  
  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(matrixUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  return (
    <div className="w-full max-w-6xl mx-auto p-4 flex flex-col md:flex-row gap-6">
      <div className="flex flex-col gap-6 md:w-3/4">
        <h1 className="text-2xl font-bold text-center">Urgent-Important Matrix (-5 to 5 Scale)</h1>
        
        {/* Task Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Enter task title..."
            className="flex-1 p-2 border border-gray-300 rounded"
          />
          <button 
            onClick={handleAddTask}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Task
          </button>
        </div>
        
        {/* Matrix */}
        <div 
          className="relative aspect-square border-2 border-gray-300 rounded-lg bg-white"
          onMouseMove={handleMatrixDrag}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          {/* Create grid lines */}
          {Array.from({ length: 9 }, (_, i) => i + 1).map(i => (
            <div key={`v-${i}`} className={`absolute top-0 bottom-0 w-px ${i === 5 ? 'bg-gray-400' : 'bg-gray-200'}`} style={{ left: `${i * 10}%` }}></div>
          ))}
          {Array.from({ length: 9 }, (_, i) => i + 1).map(i => (
            <div key={`h-${i}`} className={`absolute left-0 right-0 h-px ${i === 5 ? 'bg-gray-400' : 'bg-gray-200'}`} style={{ top: `${i * 10}%` }}></div>
          ))}
          
          {/* Scale numbers */}
          {Array.from({ length: 11 }, (_, i) => i - 5).map(i => (
            <div key={`x-${i}`} className={`absolute text-xs ${i === 0 ? 'font-bold' : 'text-gray-500'}`} style={{ left: `${(i + 5) * 10}%`, bottom: '-16px', transform: 'translateX(-50%)' }}>
              {i}
            </div>
          ))}
          {Array.from({ length: 11 }, (_, i) => i - 5).map(i => (
            <div key={`y-${i}`} className={`absolute text-xs ${i === 0 ? 'font-bold' : 'text-gray-500'}`} style={{ top: `${(5 - i) * 10}%`, left: '-16px', transform: 'translateY(-50%)' }}>
              {i}
            </div>
          ))}
          
          {/* Axis labels */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-medium">Importance</div>
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 origin-center font-medium">Urgency</div>
          
          {/* Quadrant labels */}
          <div className="absolute top-2 left-2 text-gray-600 text-sm">Important, Urgent</div>
          <div className="absolute top-2 right-2 text-gray-600 text-sm">Unimportant, Urgent</div>
          <div className="absolute bottom-2 left-2 text-gray-600 text-sm">Important, Not Urgent</div>
          <div className="absolute bottom-2 right-2 text-gray-600 text-sm">Unimportant, Not Urgent</div>
          
          {/* Tasks placed in matrix */}
          {tasks.map(task => (
            <div
              key={task.id}
              className="absolute p-2 bg-white border border-gray-300 rounded shadow-md cursor-move flex items-center gap-2 max-w-xs z-10"
              style={{ 
                left: `${task.x}%`, 
                top: `${task.y}%`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: draggedTask?.id === task.id ? '#e6f7ff' : 'white',
                opacity: task.completed ? 0.7 : 1
              }}
              onMouseDown={() => handleDragStart(task)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                toggleTaskCompletion(task.id);
              }}
            >
              <span 
                className={`truncate ${task.completed ? 'line-through text-gray-500' : ''}`}
                title={`Important: ${task.important}, Urgent: ${task.urgent}${task.completed ? " (Completed)" : ""}`}
              >
                {task.title}
              </span>
              <div className="flex gap-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFromMatrix(task.id);
                  }}
                  title="Move to unassigned list"
                  className="text-gray-500 hover:text-blue-500"
                >
                  <ArrowRight size={14} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTask(task.id);
                  }}
                  title="Delete task"
                  className="text-gray-500 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Share URL */}
        {matrixUrl && (
          <div className="flex flex-col gap-2">
            <p className="font-medium">Save this link to access your matrix later:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={matrixUrl}
                readOnly
                className="flex-1 p-2 border border-gray-300 rounded bg-gray-50"
              />
              <button
                onClick={copyLinkToClipboard}
                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
              >
                {isCopied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Unassigned tasks list */}
      <div className="md:w-1/4 bg-gray-50 p-4 rounded-lg flex flex-col gap-4">
        <h2 className="font-bold text-lg">Unassigned Tasks</h2>
        <div className="overflow-y-auto max-h-96">
          {unassignedTasks.length === 0 ? (
            <p className="text-gray-500 italic">No unassigned tasks</p>
          ) : (
            <ul className="space-y-2">
              {unassignedTasks.map(task => (
                <li 
                  key={task.id}
                  className="p-2 bg-white border border-gray-200 rounded shadow-sm flex items-center gap-2 cursor-move"
                  style={{
                    opacity: task.completed ? 0.7 : 1,
                    backgroundColor: draggedTask?.id === task.id ? '#e6f7ff' : 'white'
                  }}
                  onMouseDown={() => handleDragStart(task, true)}
                  onDoubleClick={() => toggleTaskCompletion(task.id, true)}
                >
                  <span 
                    className={`truncate flex-1 ${task.completed ? 'line-through text-gray-500' : ''}`}
                    title="Drag to matrix or double-click to mark as completed"
                  >
                    {task.title}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTask(task.id, true);
                    }}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      {/* Instructions */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="font-bold mb-2">How to use:</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>Add tasks using the input field at the top</li>
          <li>Tasks start in the unassigned list on the right</li>
          <li>Drag tasks from the unassigned list to the matrix to place them</li>
          <li>Position is based on Importance (x-axis, -5 to 5) and Urgency (y-axis, -5 to 5)</li>
          <li>Positive values indicate higher importance/urgency</li>
          <li>Double-click any task to mark it as completed/incomplete</li>
          <li>Hover over tasks to see their exact importance and urgency values</li>
          <li>Use the arrow button to move a task back to the unassigned list</li>
          <li>Save the link to return to your matrix later</li>
        </ol>
      </div>
    </div>
  );
};

export default UrgentImportantMatrix;
