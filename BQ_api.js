<html>

<head>
    <script src="https://apis.google.com/js/client.js"></script>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js"></script>
    <script type="text/javascript" src="http://www.google.com/jsapi"></script>

    <form id="formResponse" method="post">
        <label>projectID: </label>
        <input type="text" id="projectID_input" name="projectID_input"><br><br>
        <button type="submit">Submit</button><br><br>
        <label>clientID: </label>
        <input type="text" id="clientID_input" name="clientID_input"><br><br>
        <button type="submit">Submit</button><br><br>
        <label>query: </label>
        <input type="text" id="query_input" name="query_input"><br><br>
        <button type="submit">Submit</button><br><br>
    </form>
    <script>
        const a = document.getElementById('formResponse')
        var newValue;
        var clientId;
        var query;

        a.addEventListener('submit', e => {
            e.preventDefault()
            newValue = document.getElementById('projectID_input').value;
            clientId = document.getElementById('clientID_input').value;
            query = document.getElementById('query_input').value;
        })

        var clientId = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com';
        var config = {
            'client_id': clientId,
            'scope': 'https://www.googleapis.com/auth/bigquery'
        };
// client side access to google bigquery https://download.huihoo.com/google/gdgdevkit/DVD1/developers.google.com/bigquery/authorization.html
        function auth() {
            gapi.auth.authorize(config, function () {
                gapi.client.load('bigquery', 'v2');
                $('#client_initiated').html('BigQuery client authorized');
                $('#auth_button').fadeOut();
                $('#dataset_button').fadeIn();
                $('#query_button').fadeIn();
            });
        }
        //////////////////////////////////////////////////////////////////////////
        function convertBQToMySQLResults(schema, rows) {
            var resultRows = []

            function recurse(schemaCur, rowsCur, colName) {
                if (Array.isArray(schemaCur) && !Array.isArray(result[colName])) {
                    for (var i = 0, l = schemaCur.length; i < l; i++) {
                        if (colName === "")
                            recurse(schemaCur[i], rowsCur.f[i], colName + schemaCur[i].name)
                        else
                            recurse(schemaCur[i], rowsCur.f[i], colName + "." + schemaCur[i].name)
                    }
                }

                if (schemaCur.type && schemaCur.type === "RECORD") {
                    if (schemaCur.mode !== "REPEATED") {
                        var valIndex = 0
                        for (var p in schemaCur.fields) {
                            if (rowsCur.v === null) {
                                recurse(schemaCur.fields[p], rowsCur, colName + "." + schemaCur.fields[p].name)
                            } else {
                                recurse(schemaCur.fields[p], rowsCur.v.f[valIndex], colName + "." + schemaCur.fields[p]
                                    .name)
                            }

                            valIndex++
                        }
                    }

                    if (schemaCur.mode === "REPEATED") {
                        result[colName] = []
                        for (var x in rowsCur.v) {
                            recurse(schemaCur.fields, rowsCur.v[x], colName)
                        }
                    }
                } else {
                    if (schemaCur.mode === "REPEATED") {
                        if (rowsCur.v !== null) {
                            result[colName] = rowsCur.v.map((value, index) => {
                                return value.v
                            })
                        } else {
                            result[colName] = [null]
                        }

                    } else if (Array.isArray(result[colName])) {
                        let nextRow = {}
                        for (var j in schemaCur) {
                            nextRow[colName + "." + schemaCur[j].name] = rowsCur.v.f[j].v
                        }
                        result[colName].push(nextRow)
                    } else {
                        if (colName !== "")
                            result[colName] = rowsCur.v
                    }
                }
            }

            for (var r = 0, rowsCount = rows.length; r < rowsCount; r++) {
                var result = {};
                recurse(schema, rows[r], "")
                resultRows.push(result)
            }

            return resultRows
        }

       var objArray=[] //data
       var items = {}
        // Query function
        function runQuery(projectNumber) {
            var request = gapi.client.bigquery.jobs.query({
                'projectId': projectNumber,
                'timeoutMs': '30000',
                'query': query //'SELECT * FROM [bigquery-public-data:samples.github_timeline]'
            });
            request.execute(function (response) {
                //$('#result_box').html(JSON.stringify(output, null)); // JSON original format with v, f

                // transfrom results from big query with v's and f's to JSON
                items = convertBQToMySQLResults(response.schema.fields, response.rows)
                // convert JSON to csv format and save. https://stackoverflow.com/questions/8847766/how-to-convert-json-to-csv-format-and-store-in-a-variable
                const replacer = (key, value) => value === null ? '' :
                    value // specify how you want to handle null values here
                const header = Object.keys(items[0])
                const csv = [
                    header.join(',').replace(/d_/g, ""), // header row first, remove extra characters: "d_"
                    ...items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer))
                        .join(','))
                ].join('\r\n')

                // save items and csv version globally
                for ([key,val] of Object.entries(items)){
                    for ([key2,val2] of Object.entries(items[key])){
                        objArray.push(val2)
                        break
                        }
                    }
            // view csv data in browser and console
                $('#result_box').html(csv);
                
            // download as csv https://stackoverflow.com/questions/17836273/export-javascript-data-to-csv-file-without-server-interaction
                var a = document.createElement('a');
                a.href = 'data:attachment/csv,' + encodeURIComponent(csv);
                a.target = '_blank';
                a.download = 'myFile.csv';
                document.body.appendChild(a);
                a.click();
            });
            
        }

        function listDatasets(projectNumber) {
            var request = gapi.client.bigquery.datasets.list({
                'projectId': projectNumber
            });
            request.execute(function (response) {
                $('#result_box').html(JSON.stringify(response.result.datasets, null));
                let datasets = JSON.stringify(response.result.datasets, null)
                console.log("datasets: ", datasets)
            });
        }
    </script>
</head>

<body>
    <button id="auth_button" onclick="auth();">Authorize</button>
    <div id="client_initiated"></div>
    <button id="dataset_button" style="display:none;" onclick="listDatasets(newValue);">Show datasets</button>
    <button id="query_button" style="display:none;" onclick="runQuery(newValue);">Run Query</button>
    <div id="result_box"></div>
    <div id="result_box"></div>

</body>

</html>
