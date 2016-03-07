'use strict';
(function(){

angular.module('app').controller("SeriesGeneralController", function ($http, $q, $filter, $routeParams, $rootScope, $location, $route) { 
    var pmk = this;

    var init = true; //TODO delete
    pmk.min_date = '1970-01-01';  //TODO init with $rootScope.min_date
    pmk.template = window.pmk.template;    

    pmk.range = range; //Used by pager
    pmk.check_all_history = check_all_history; //Used bydatepicker    
    
    pmk.current_span = 'month';
    pmk.span_format = {
        'year': {
            'moment':{
                'get':'YYYY',
                'show_short':'YYYY',
                'show_long': 'YYYY',
            },
            'filter':'yyyy',
        },
        'month': {
            'moment':{
                'get': 'YYYY-MM',
                'show_short': 'MMM YYYY',
                'show_long': 'MMMM YYYY',
            },
            'filter': 'MMMM yyyy',
        },
        'day': {
            'moment':{
                'get': 'YYYY-MM-DD',
                'show_short': 'DD MMM YYYY',
                'show_long': 'DD MMMM YYYY',
            },
            'filter': 'dd MMM yyyy',
        },
    };

    // Total views
    pmk.total_views = 0;

    // Pagination
    pmk.total_pages = {
        'mv' : 1,
    };

    pmk.total_items = {
        'mv' : 0,
    };

    pmk.page = {
        'mv' : 1,
    }
    pmk.items_page = {
        'mv' : 10,
    };

    pmk.view_stack = [];
    pmk.current = {};

    // Filters
    pmk.filter = {
        'title': '',
    }

    pmk.slider_mv = {
        'min' : 1,
        'max' : 10,
    };

    pmk.mmobj_mv = true;

    //FIXME: Change name to datepicker
    pmk.datepicker_mv = {
        'model' : {
            'startDate': moment(pmk.min_date),
            'endDate':   moment()
        },
        'locale': {
            'format': 'DD MMM YYYY',
        },
        'ranges': {
            'Today' : [moment(), moment()],
            'Yesterday': [moment().subtract(1,'days'), moment().subtract(1,'days')],
            'Last 7 days': [moment().subtract(7, 'days'), moment()],
            'Last 30 days': [moment().subtract(30, 'days'), moment()],
            'Last 365 days': [moment().subtract(1, 'year'), moment()],
            'This month': [moment().startOf('month'), moment()],
            'This year': [moment().startOf('year'), moment()],
            'All history': [moment(pmk.min_date),moment()],
        },
        'min_date': pmk.min_date,
        'max_date': moment().format('YYYY-MM-DD'),
        'text': 'All history',
    }

    pmk.most_viewed = {
        'options' : {
            chart : {
                //noData: "Loading data...",
                type : 'multiBarHorizontalChart',
                showControls: false,
                showLegend: false,
                height: 400,
                x: function(d){
                    var id_label = [d.id,d.label];
                    id_label.push((pmk.page.mv-1)*10 + pmk.mv.data[0].values.indexOf(d) +1);
                    return id_label;
                },
                y: function(d){return d.value;},
                tooltip: {
                    gravity: 'e',  
                    //valueFormatter: function(d){return d;}, // Returns the field size if it is a parent
                    //keyFormatter: function(d){return d;}, // Returns the field name of the node
                    contentGenerator: generateTooltip,
                },
                xAxis: {
                    showMaxMin: false,
                    tickPadding: 20,
                    tickFormat: function(d){
                        var label = d[2] + '. ' + d[1];
                        if (label.length>12){
                           label = (label.slice(0,11) + '...'); 
                        }
                        return label;
                    }
                },
                yAxis: {
                    axisLabel: 'Views',
                    tickFormat: function(d){
                        return d;
                    }
                },
                margin: {
                    left: 120, //170,
                    right: 50,
                }
            },
        },
        'data' : [],
        'config': {
            'extended': true,
        },
    };

    pmk.historical = {
        'options': {
            chart: {
                type: 'historicalBarChart',
                height: 450,
                margin : {
                    top: 20,
                    right: 20,
                    bottom: 65,
                    left: 50
                },
                x: function(d){ return d[0];},
                y: function(d){ return d[1];},
                showValues: true,
                valueFormat: function(d){
                    return d;
                },
                xAxis: {
                    axisLabel: '',
                    tickFormat: function(d){
                        if (typeof(d)=='number'){
                            return moment(d).format(pmk.span_format[pmk.current_span].moment.show_short);
                        }
                        return d;
                    },
                    rotateLabels: 30,
                        showMaxMin: false
                },
                yAxis: {
                    axisLabel: 'Views',
                    //axisLabelDistance: -10,
                    tickFormat: function(d){
                        return d;
                    }
                },
                tooltip: {
                    keyFormatter: function(d) {
                        return moment(d).format(pmk.span_format[pmk.current_span].moment.show_long);
                    }
                },
                zoom: {
                    enabled: false,
                    scaleExtent: [1, 10],
                    useFixedDomain: false,
                    useNiceScale: false,
                    horizontalOff: false,
                    verticalOff: true,
                    unzoomEventType: 'dblclick.zoom'
                },
            },
        },
        'data': [],
        'config': {
            'extended': true,
        }
    };

    activate();

    function activate(){

        // Load template depending on route and route params
        var obj_type = 'series';
        var obj_scope = 'general';

        //Load URL parameters
        if ($routeParams.from_date != undefined){
            pmk.datepicker_mv.model.startDate = moment($routeParams.from_date, pmk.span_format.day.moment.get);
        }
        if ($routeParams.to_date != undefined){
            pmk.datepicker_mv.model.endDate = moment($routeParams.to_date,pmk.span_format.day.moment.get);
        }
        if ($routeParams.title != undefined){
            pmk.filter.title = $routeParams.title;
        }
        if ($routeParams.span != undefined){
            pmk.current_span = $routeParams.span;
        }
        if ($routeParams.page != undefined){
            pmk.page.mv = $routeParams.page;
        }

        pmk.mv = angular.copy(pmk.most_viewed);
        
        pmk.his = angular.copy(pmk.historical),

        setTimeout(function(){
            get_most_viewed();
            get_historical_data();            
        },500);

    }


    // SCOPE FUNCTIONS
    
    function go_to_page(page){
        if (page > 0 && page < pmk.total_pages.mv +1){
            pmk.page.mv = page;
            set_url_parameters('page');
        }
    }

    function range(num){
        var range;
        // Allways show 5 items
        //
        // If num [0-3] --> 1,1,2,3,...,total
        // If num [total-3,total] --> 1,...,total-3,total-2,total-1,total
        // If num [4,total-4] --> 1,...,num-1,num,num+1,...,total
        var page = pmk.page.mv;
        if (num > 6){
            if (page > 3 && page < num-3){
                range = [1,'...',page-1,page,page+1,'...',num];
            }else if (page <= 3){
                range = [1,2,3,4,'...',num];
            }else if (page >= num-2){
                range = [1,'...',num-3,num-2,num-1,num];
            }
        }else{
            range = Array.apply(null,Array(num)).map(function (x, i) { return i+1; });
        }
        return range;
    }

    function toggle_daterange(event_click){
        $("#form_daterangepicker").click();
    }

    function go_to(tabe, scope_obj){

        var id = scope_obj ? '/'+scope_obj.id : '';
        var params = $routeParams;
        var params_encod = '?'
        angular.forEach(params, function(value,key){
            if (key !== 'page'){
                params_encod = params_encod + key + '=' + value + '&';
            }
        })
        $location.url('/admin/stats/' + tabe + id + params_encod);
    }

    function check_all_history(){
        debugger;
        var min_model = pmk.datepicker_mv.model.startDate.format('YYYY-MM-DD');
        var max_model = pmk.datepicker_mv.model.endDate.format('YYYY-MM-DD');
        return (min_model == pmk.datepicker_mv.min_date && 
                max_model == pmk.datepicker_mv.max_date);
    }

    function set_url_parameters(origin){

        save_string_dates();
        var tab = 'series';
        var scope = 'general';

        if (!(origin=='datepicker' && typeof(pmk.datepicker_mv.model) === 'object')){

            // FIXME: Avoiding infinite loop with init var
            if (!init){
                var updated_params = {};
                if (origin == 'datepicker' || origin == 'all'){
                    updated_params.from_date = check_all_history() ? null:pmk.datepicker_mv.model_debug.from_date;
                    updated_params.to_date = check_all_history() ? null:pmk.datepicker_mv.model_debug.to_date;
                }

                if (origin == 'filter' || origin == 'all'){
                    updated_params.title = pmk.filter.title == "" ? null:pmk.filter.title;
                }

                if (origin == 'timespan'){
                    updated_params.span = pmk.current_span == "month" ? null:pmk.current_span;
                }
                
                if (origin == 'page'){
                    updated_params.page = pmk.page.mv != 0 ? pmk.page.mv:null;
                }

                reload(updated_params);
            }else{
                init = false;
            }
        }

        function reload(updated_params){
            var params = angular.copy($routeParams); 
            angular.forEach(updated_params, function(value,key){
                if (value != null){
                    params[key] = value;
                }else{
                    delete params[key];
                }
            })
            if (angular.equals($routeParams,params)){
                $route.reload();
            }else{
                $location.search(params);
            }
        }
        
    }

    function clear_filter(filter_type){
        
        if (filter_type=='datepicker' || filter_type=='all'){
            var from_date = pmk.datepicker_mv.ranges['All history'][0]
                .format(pmk.datepicker_mv.locale.format);
            var to_date = pmk.datepicker_mv.ranges['All history'][1]
                .format(pmk.datepicker_mv.locale.format);
            pmk.datepicker_mv.model = from_date + ' - ' + to_date;
        } 
        if (filter_type=='filter' || filter_type=='all'){
            pmk.filter.title = '';
        }
        set_url_parameters(filter_type);
    }

    //INTERNAL FUNCTIONS
    function get_most_viewed(origin){

        var params = {
            'limit': pmk.items_page.mv,
            'from_date' : pmk.datepicker_mv.min_date,
            'to_date' : pmk.datepicker_mv.max_date,
            'page': pmk.page.mv - 1,
        }
        
        if (pmk.filter.title != ""){
            // FIXME: Hardcoded search in english
            params['criteria[title.en][$regex]'] = pmk.filter.title;
            // Case insensitive
            params['criteria[title.en][$options]'] = 'i';
            
        }

        $http({
            method: 'GET',
            url: '/api/media/series/most_viewed',
            params: params,
        })
        .then(getMVSuccess);
    }

    function getMVSuccess(data){
        if (data.data.total){
            pmk.total_items.mv = data.data.total;
        }

        pmk.total_pages.mv = Math.ceil(data.data.total/pmk.items_page.mv);
        var most_viewed = [];
        var items = data.data.series;

        for (var item_indx in items){
            data = {
                'label': items[item_indx].series.title[items[item_indx].series.locale],
                'value': items[item_indx].num_viewed,
                'id': items[item_indx].series.id,
            }
            most_viewed.push(data);                
        }
        
        var new_data = [{
            'key': '',
            'color': '#ED6D00',
            'values': most_viewed,
        }];
        var aux = angular.copy(new_data);
        pmk.mv.data = aux;
        pmk.mv.api.update()        
    }
    

    function generateTooltip(d){
        return "<table>" +
            "  <tbody>" +
            "    <tr>" +
            "      <td class='legend-color-guide'>" +
            "        <div style='background-color: " + d.color + " '>" +
            "        </div>" +
            "      </td>" +
            "      <td class='key'>" + d.data.label +
            "      </td>" +
            "      <td class='value'>" + d.data.value +
            "      </td>"
            "    </tr>" +
            "  </tbody>"+
            "</table>";

    }





    function get_series_timeline(){
        //FIXME: hardcoded
        //var mock = ['568a8f7c8fe96702028b457f','568a8f858fe96702028b45fc','568a8f7f8fe96702028b45b3'];
        var ids = [];
        var tab = pmk.view.tabes.series ? 'series':'objects';
        var scope = pmk.view.scope == 'general'? 'general':'particular';
        var most_viewed = pmk.mv[tab][scope].data[0].values;
        for (var value_indx in most_viewed){
            ids.push(most_viewed[value_indx].id);
        }
        pmk.tl[tab][scope].new_data = [];
        var promises = []
            for (var serie_id_indx in ids){
                promises.push(createPromise(ids[serie_id_indx]));
            }
        $q.all(promises).then(getTLSuccess);
    }

    function createPromise(id){
        // Series general --> series
        // Series particular --> mmobj
        // Objects general --> mmobj
        // Objects particular --> mmobj
        var tl_data = pmk.view.tabes.series && pmk.view.scope == 'general' ? 'series':'mmobj';
        var params = {
            'from_date': pmk.datepicker_mv.model_debug.from_date,
            'to_date': pmk.datepicker_mv.model_debug.to_date,
        }
        if (tl_data == 'series'){
            params.series = id; 
        }else{
            params.mmobj = id;
        }

        return( 
                $http({
                    method: 'GET',
                    url: '/api/media/views/' + tl_data,
                    params: params,
                })
                .then(addDataElem)
              );
    }

    function addDataElem(data){
        var views = data.data.views;
        var tab = pmk.view.tabes.series ? 'series':'objects';
        var scope = pmk.view.scope == 'general'? 'general':'particular';
        var mv_data = pmk.view.tabes.series && pmk.view.scope == 'general' ? 'series':'mmobj';
        var orig = $filter('filter')(pmk.mv[tab][scope].data[0].values, {'id': data.data[mv_data + '_id']}, true);
        var mmobj = {
            //FIXME: series_id, later be mmobj_id
            'key' : orig[0].label,
            'values' : [],        
        };
        for(var span_indx in views){
            //FIXME: hardcoded
            mmobj.values.push([
                    moment(views[span_indx]['_id'],pmk.span_format[pmk.current_span].moment.get).valueOf(), 
                    //views[span_indx]['_id'],
                    views[span_indx].numView
                    ]);
        }
        pmk.tl[tab][scope].new_data.push(mmobj);
    }



    function get_historical_data(origin){

        // The array could be of length 1 depending on the view
        var ids = [];
        var tab = 'series';
        var scope = 'general';

        if ((!(origin=='datepicker' && typeof(pmk.datepicker_mv.model) === 'object')) && !(pmk.his.api == undefined)){

            if (pmk.his.api != undefined){


                var params = {
                    'from_date': pmk.datepicker_mv.min_date,
                    'to_date': pmk.datepicker_mv.max_date,
                    'group_by': pmk.current_span,
                }
                
                if (pmk.filter.title != ""){
                    // FIXME: Hardcoded search in english
                    params['criteria[title.en][$regex]'] = pmk.filter.title;
                    // Case insensitive
                    params['criteria[title.en][$options]'] = 'i';
                    
                }
                $http({
                    method: 'GET',
                    url: '/api/media/views',
                    params: params,
                }).then(addDataElem_his);
            }
        }
    }

    function addDataElem_his(data){

        var views = data.data.views;
        var tab = 'series';
        var scope = 'general';

        var data_elem = [];
        for(var span_indx=0; span_indx<views.length; span_indx++){
            data_elem.push([
                    moment(views[span_indx]['_id'],pmk.span_format[pmk.current_span].moment.get).valueOf(), 
                    //views[span_indx]['_id'],
                    views[span_indx].numView
                    ]);
        }
        data_elem.sort( function (a,b){ return a[0]-b[0]});

        // Aggregate data
        if (!pmk.his.new_data || pmk.his.new_data.length == 0){
            // TODO: better add 0 values when there are no views
            // first should be an array with 0 values as views
            pmk.his.new_data = angular.copy(data_elem);
        }else{
            var new_data = pmk.his[tab][scope].new_data;
            var count = 0;

            for (var bar_indx=0; bar_indx<new_data.length; bar_indx++){
                for (var i=count; i<data_elem.length; i++){
                    if (new_data[bar_indx][0] < data_elem[count][0]){
                        break;
                    }
                    if (new_data[bar_indx][0] == data_elem[count][0]){
                        new_data[bar_indx][1] = parseInt(new_data[bar_indx][1]) + parseInt(data_elem[count][1]);
                        count = count + 1;
                        break;
                    }
                    if (new_data[bar_indx][0] > data_elem[count][0]){
                        new_data.splice(bar_indx,0,data_elem[count]);
                        count = count + 1;
                    }
                }
            }
        }
        
        var data = {
            'key' : '',
            'bar' : true,
            'values' : pmk.his.new_data,
        }
        pmk.his.data = [angular.copy(data)];
        pmk.his.api.update();
    }

});

    


})();
