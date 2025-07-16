class LocalityVisualizer {
  constructor() {
    this.defaultConfig = {
      width: 280,
      height: 160,
      colors: {
        background: '#1e1e1e',
        nodeFill: '#a5b4fc',
        nodeStroke: '#a5b4fc',
        nodeHoverFill: '#818cf8',
        linkStroke: '#4b5563',
        linkHoverStroke: '#a5b4fc',
        textFill: '#e5e7eb',
        textHoverFill: '#ffffff'
      },
      node: {
        radius: 4,
        hoverRadius: 8,
        strokeWidth: 1.5,
        hoverStrokeWidth: 2.5
      },
      link: {
        strokeWidth: 1,
        hoverStrokeWidth: 2,
        opacity: 0.6,
        hoverOpacity: 0.9
      },
      text: {
        fontSize: '10px',
        fontWeight: '400',
        maxLabelLength: 18,
        offset: 12
      }
    };
  }

  createVisualization(localityData, config = {}) {
    const localities = [
      { name: localityData.district, type: 'central' },
      { name: localityData.street, type: 'child' },
      { name: localityData.street2, type: 'child' }
    ].filter(loc => loc.name);

    if (localities.length === 0) return '';

    const vizId = `locality-viz-${Math.random().toString(36).substr(2, 9)}`;
    const finalConfig = this.mergeDeep(this.defaultConfig, config);

    const svgHTML = `
      <div class="locality-visualization obsidian-graph" style="
        margin: 10px 0; 
        border-radius: 12px; 
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        background: ${finalConfig.colors.background};
      ">
        <svg id="${vizId}" width="${finalConfig.width}" height="${finalConfig.height}" 
             style="background: ${finalConfig.colors.background}; display: block;"></svg>
      </div>
    `;

    setTimeout(() => {
      this.renderObsidianGraph(vizId, localities, finalConfig);
    }, 50);

    return svgHTML;
  }

  renderObsidianGraph(svgId, localities, config) {
    if (typeof d3 === 'undefined') {
      console.error('D3.js is required for locality visualization');
      return;
    }

    const svg = d3.select(`#${svgId}`);
    svg.selectAll('*').remove();

    const container = svg.append('g').attr('class', 'graph-container');
    const linkGroup = container.append('g').attr('class', 'links');
    const nodeGroup = container.append('g').attr('class', 'nodes');
    const labelGroup = container.append('g').attr('class', 'labels');

    const nodes = localities.map((loc, i) => ({ ...loc, id: i }));
    const links = this.generateLinks(nodes);

    const linkElements = linkGroup.selectAll('.link')
      .data(links)
      .enter().append('line')
      .attr('stroke', config.colors.linkStroke)
      .attr('stroke-width', config.link.strokeWidth)
      .attr('opacity', config.link.opacity);

    const nodeElements = nodeGroup.selectAll('.node')
      .data(nodes)
      .enter().append('circle')
      .attr('r', d => d.type === 'central' ? config.node.radius * 1.4 : config.node.radius)
      .attr('fill', d => d.type === 'central' ? '#ffffff' : config.colors.nodeFill)
      .attr('stroke', d => d.type === 'central' ? '#ffffff' : config.colors.nodeStroke)
      .attr('stroke-width', config.node.strokeWidth)
      .attr('class', 'node')
      .style('cursor', 'pointer');

    const labelElements = labelGroup.selectAll('.label')
      .data(nodes)
      .enter().append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', d => d.type === 'central' ? '13px' : config.text.fontSize)
      .attr('font-weight', d => d.type === 'central' ? '600' : config.text.fontWeight)
      .attr('fill', config.colors.textFill)
      .text(d => d.name.length > config.text.maxLabelLength ? d.name.slice(0, config.text.maxLabelLength) + '...' : d.name);

    this.runForceSimulation(nodes, links, () => {
      linkElements
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodeElements
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      labelElements
        .attr('x', d => d.x)
        .attr('y', d => d.y + config.text.offset);
    });

    const zoom = d3.zoom()
      .scaleExtent([0.3, 2])
      .on('zoom', event => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);
    
    const initialTransform = d3.zoomIdentity.scale(0.8);
    svg.call(zoom.transform, initialTransform);
  }

  runForceSimulation(nodes, links, onTick) {
    d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.source.type === 'central' ? 80 : 50))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(this.defaultConfig.width / 2, this.defaultConfig.height / 2))
      .on('tick', onTick);
  }

  generateLinks(nodes) {
    const links = [];
    const central = nodes.find(n => n.type === 'central');
    for (const node of nodes) {
      if (node.id !== central.id) {
        links.push({ source: central, target: node });
      }
    }
    return links;
  }

  mergeDeep(target, source) {
    const output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) Object.assign(output, { [key]: source[key] });
          else output[key] = this.mergeDeep(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  static create(localityData) {
    const visualizer = new LocalityVisualizer();
    return visualizer.createVisualization(localityData);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LocalityVisualizer;
} else {
  window.LocalityVisualizer = LocalityVisualizer;
}
